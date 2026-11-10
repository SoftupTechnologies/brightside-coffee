import { randomInt } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cloudWatchSink } from './cloudwatch.js';

/** The shop's folder, as a file URL and a path, which stack frames name relative to it. */
const ROOT_PATH = fileURLToPath(new URL('../', import.meta.url));
const ROOT_URL = pathToFileURL(ROOT_PATH).href;

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A short reference a customer can read out to support, such as "K7QM2X". */
export function newReference() {
  let ref = '';
  for (let i = 0; i < 6; i++) ref += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return ref;
}

/**
 * The text of one failure: `ERROR ref=<ref> <Type>: <message>` and the stack frames below it, one event in
 * CloudWatch. The reference stays out of the message, so every failure of one kind reads the same apart from its
 * numbers and ids.
 */
export function errorLine(error, ref) {
  const stack = typeof error?.stack === 'string' ? error.stack : `${error?.name ?? 'Error'}: ${error?.message ?? error}`;
  // Frames name the shop's files from its root (src/checkout/invoice.js), wherever it runs, as a deployed app's do.
  return `ERROR ref=${ref} ${stack.split(ROOT_URL).join('').split(ROOT_PATH).join('')}`;
}

/**
 * The shop's logger. Every line goes to stdout; when a CloudWatch sink is configured (cloudwatch.js), the lines are
 * also sent there in small batches. A failure to send is reported once on stderr and never breaks a request.
 */
export function createLogger({ sink = cloudWatchSink(), write = (text) => process.stdout.write(`${text}\n`),
  warn = (text) => process.stderr.write(`${text}\n`), batchMs = 200 } = {}) {
  let queue = [];
  let timer = null;
  let sending = Promise.resolve();
  let warned = false;

  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!sink || queue.length === 0) return sending;
    const events = queue;
    queue = [];
    sending = sending.then(() => sink.send(events)).then(() => { warned = false; }, (error) => {
      if (!warned) warn(`WARN log lines not sent to ${sink.describe}: ${error.message}`);
      warned = true;
    });
    return sending;
  };

  const log = (text) => {
    write(text);
    if (!sink) return;
    queue.push({ timestamp: Date.now(), message: text });
    timer ??= setTimeout(flush, batchMs);
  };

  return {
    sink,
    /** A line about normal work, as `key=value` pairs, e.g. info('order placed', { id: 1043 }). */
    info(what, fields = {}) {
      const pairs = Object.entries(fields).map(([key, value]) => ` ${key}=${value}`).join('');
      log(`INFO ${what}${pairs}`);
    },
    /** One failure, with its stack; returns the reference shown to the customer. */
    error(error, ref = newReference()) {
      log(errorLine(error, ref));
      return ref;
    },
    /** Sends what is queued; resolves when it has been sent (or failed). */
    flush
  };
}
