import { hostname } from 'node:os';
import {
  CloudWatchLogsClient,
  CreateLogStreamCommand,
  PutLogEventsCommand
} from '@aws-sdk/client-cloudwatch-logs';

/**
 * Where the shop's log lines go besides stdout, from the environment:
 * - DEMO_CLOUDWATCH_ENDPOINT: a fake CloudWatch Logs, such as the one in Akeso's compose stack. Events are posted to
 *   its control API, `POST <endpoint>/_fake/events`, which needs no AWS credentials.
 * - DEMO_LOG_GROUP (without DEMO_CLOUDWATCH_ENDPOINT): real CloudWatch Logs, through PutLogEvents, with the AWS
 *   credentials and region of the usual chain (AWS_PROFILE or AWS_ACCESS_KEY_ID..., AWS_REGION).
 * - neither: stdout only (null).
 * DEMO_LOG_GROUP names the log group in both cases (default /demo/brightside-coffee) and DEMO_LOG_STREAM the stream
 * (default checkout-<host name>).
 */
export function cloudWatchSink(env = process.env) {
  const group = env.DEMO_LOG_GROUP?.trim() || '/demo/brightside-coffee';
  const stream = env.DEMO_LOG_STREAM?.trim() || `checkout-${hostname().replace(/[:*]/g, '-')}`;
  const endpoint = env.DEMO_CLOUDWATCH_ENDPOINT?.trim();
  if (endpoint) return fakeCloudWatchSink({ endpoint, group, stream });
  if (env.DEMO_LOG_GROUP?.trim()) return awsCloudWatchSink({ group, stream, region: env.AWS_REGION?.trim() || undefined });
  return null;
}

/** Posts events to a fake CloudWatch Logs' control API. */
export function fakeCloudWatchSink({ endpoint, group, stream }) {
  const url = new URL('/_fake/events', endpoint).toString();
  return {
    describe: `fake CloudWatch Logs at ${endpoint}, group ${group}`,
    async send(events) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ group, events: events.map((event) => ({ ...event, stream })) }),
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) throw new Error(`the fake CloudWatch answered ${response.status}: ${await response.text()}`);
    }
  };
}

/**
 * Puts events into a CloudWatch Logs group with PutLogEvents, creating the stream the first time. The group must
 * exist; the IAM policy in the README allows exactly these two actions on it.
 */
export function awsCloudWatchSink({ group, stream, region, client = new CloudWatchLogsClient({ region }) }) {
  let streamReady = null;
  const createStream = async () => {
    try {
      await client.send(new CreateLogStreamCommand({ logGroupName: group, logStreamName: stream }));
    } catch (error) {
      if (error.name !== 'ResourceAlreadyExistsException') throw error;
    }
  };
  const put = (events) => client.send(new PutLogEventsCommand({ logGroupName: group, logStreamName: stream, logEvents: events }));

  return {
    describe: `CloudWatch Logs group ${group}, stream ${stream}`,
    async send(events) {
      streamReady ??= createStream().catch((error) => {
        streamReady = null;
        throw error;
      });
      await streamReady;
      try {
        await put(events);
      } catch (error) {
        // The stream was deleted while the shop ran.
        if (error.name !== 'ResourceNotFoundException') throw error;
        await createStream();
        await put(events);
      }
    }
  };
}
