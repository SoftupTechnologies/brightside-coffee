import { createServer } from 'node:http';
import { createApp } from '../src/app.js';
import { createLogger } from '../src/logger.js';
import { memoryStore } from '../src/store/memory.js';

/**
 * The shop on a free port with an in-memory store and a logger that keeps its lines. `store` replaces the memory
 * store's methods given; `env` is the environment the app reads.
 */
export async function startShop({ env = {}, store: overrides = {}, now } = {}) {
  const store = Object.assign(memoryStore(), overrides);
  const lines = [];
  const logger = createLogger({ sink: null, write: (text) => lines.push(text) });
  const server = createServer(createApp({ store, logger, env, build: { commit: 'test', dirty: false, buildId: 'test' }, ...(now ? { now } : {}) }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    url,
    store,
    lines,
    errors: () => lines.filter((line) => line.startsWith('ERROR')),
    get: (path) => fetch(new URL(path, url), { redirect: 'manual' }),
    post: (path, fields) => fetch(new URL(path, url), { method: 'POST', body: new URLSearchParams(fields), redirect: 'manual' }),
    close: () => new Promise((resolve) => server.close(resolve))
  };
}
