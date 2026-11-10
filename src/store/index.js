import { memoryStore } from './memory.js';
import { postgresStore } from './postgres.js';

/** Postgres when DATABASE_URL is set, else memory (the data is lost when the server stops). */
export function openStore(env = process.env) {
  const url = env.DATABASE_URL?.trim();
  return url ? postgresStore(url) : memoryStore();
}
