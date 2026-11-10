import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { awsCloudWatchSink, cloudWatchSink, fakeCloudWatchSink } from '../src/cloudwatch.js';
import { createLogger, errorLine, newReference } from '../src/logger.js';

/** A local HTTP server that records each request's path, headers and JSON body and answers with `answer`. */
async function recorder(answer = () => ({ status: 200, body: {} })) {
  const requests = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const request = { path: req.url, headers: req.headers, body: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') };
    requests.push(request);
    const { status, body, headers = {} } = answer(request, requests.length);
    res.writeHead(status, { 'content-type': 'application/x-amz-json-1.1', ...headers });
    res.end(JSON.stringify(body));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, requests, close: () => new Promise((resolve) => server.close(resolve)) };
}

test('an error line is ERROR, the reference, then the stack', () => {
  const error = new TypeError('boom');
  const line = errorLine(error, 'K7QM2X');
  assert.ok(line.startsWith('ERROR ref=K7QM2X TypeError: boom\n    at '), line);
  assert.equal(errorLine({ name: 'Odd', message: 'no stack' }, 'AAAAAA'), 'ERROR ref=AAAAAA Odd: no stack');
  assert.match(newReference(), /^[A-HJ-NP-Z2-9]{6}$/);
});

test('without a CloudWatch setting the logs go to stdout only', () => {
  assert.equal(cloudWatchSink({}), null);
  assert.equal(cloudWatchSink({ DEMO_CLOUDWATCH_ENDPOINT: ' ', DEMO_LOG_GROUP: '' }), null);
  assert.match(cloudWatchSink({ DEMO_CLOUDWATCH_ENDPOINT: 'http://localhost:4566' }).describe, /^fake CloudWatch Logs at http:\/\/localhost:4566, group \/demo\/brightside-coffee$/);
  assert.match(cloudWatchSink({ DEMO_LOG_GROUP: '/prod/brightside', AWS_REGION: 'eu-central-1' }).describe, /^CloudWatch Logs group \/prod\/brightside, stream checkout-/);
});

test('every line is written to stdout and sent to the fake CloudWatch in one batch', async (t) => {
  const fake = await recorder();
  t.after(fake.close);
  const lines = [];
  const logger = createLogger({ sink: fakeCloudWatchSink({ endpoint: fake.url, group: '/demo/test', stream: 'one' }), write: (text) => lines.push(text) });
  logger.info('order placed', { order: 1001 });
  const ref = logger.error(new RangeError('Invalid time value'));
  await logger.flush();

  assert.equal(lines[0], 'INFO order placed order=1001');
  assert.ok(lines[1].startsWith(`ERROR ref=${ref} RangeError: Invalid time value\n`));
  assert.equal(fake.requests.length, 1);
  const [{ path, body }] = fake.requests;
  assert.equal(path, '/_fake/events');
  assert.equal(body.group, '/demo/test');
  assert.deepEqual(body.events.map((e) => [e.message, e.stream]), lines.map((line) => [line, 'one']));
  assert.ok(body.events.every((e) => Number.isFinite(e.timestamp)));
});

test('a CloudWatch that refuses is reported once on stderr and does not break logging', async (t) => {
  const fake = await recorder(() => ({ status: 503, body: { message: 'down' } }));
  t.after(fake.close);
  const warnings = [];
  const logger = createLogger({ sink: fakeCloudWatchSink({ endpoint: fake.url, group: 'g', stream: 's' }), write: () => {}, warn: (text) => warnings.push(text) });
  logger.info('one');
  await logger.flush();
  logger.info('two');
  await logger.flush();
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /^WARN log lines not sent to fake CloudWatch Logs at .*: the fake CloudWatch answered 503/);
});

test('real CloudWatch: the stream is created once (an existing one is fine) and the events are put', async (t) => {
  const aws = await recorder((request) => {
    const operation = request.headers['x-amz-target'];
    if (operation === 'Logs_20140328.CreateLogStream') {
      return { status: 400, headers: { 'x-amzn-errortype': 'ResourceAlreadyExistsException' },
        body: { __type: 'ResourceAlreadyExistsException', message: 'The specified log stream already exists' } };
    }
    return { status: 200, body: { nextSequenceToken: '1' } };
  });
  t.after(aws.close);
  const client = new CloudWatchLogsClient({
    region: 'eu-central-1', endpoint: aws.url, credentials: { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'test-secret' }
  });
  const sink = awsCloudWatchSink({ group: '/prod/brightside', stream: 'checkout-test', client });
  await sink.send([{ timestamp: 1, message: 'INFO one' }]);
  await sink.send([{ timestamp: 2, message: 'INFO two' }]);

  assert.deepEqual(aws.requests.map((r) => r.headers['x-amz-target']),
    ['Logs_20140328.CreateLogStream', 'Logs_20140328.PutLogEvents', 'Logs_20140328.PutLogEvents']);
  assert.deepEqual(aws.requests[0].body, { logGroupName: '/prod/brightside', logStreamName: 'checkout-test' });
  assert.deepEqual(aws.requests[2].body, { logGroupName: '/prod/brightside', logStreamName: 'checkout-test', logEvents: [{ timestamp: 2, message: 'INFO two' }] });
  assert.match(aws.requests[1].headers.authorization, /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/eu-central-1\/logs\/aws4_request/);
});
