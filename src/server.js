import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { buildStamp } from './build-stamp.js';
import { createLogger } from './logger.js';
import { openStore } from './store/index.js';

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

const logger = createLogger();
const store = openStore();
const app = createApp({ store, logger, build: buildStamp(APP_DIR) });
const server = createServer(app);

server.listen(port, host, () => {
  logger.info('listening', {
    url: `http://localhost:${port}`,
    store: store.kind,
    logs: logger.sink ? JSON.stringify(logger.sink.describe) : 'stdout',
    demo_mode: process.env.DEMO_MODE === '1' ? 'on' : 'off'
  });
});

async function stop() {
  server.close();
  await logger.flush();
  await store.close();
  process.exit(0);
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
