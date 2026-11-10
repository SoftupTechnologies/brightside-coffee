// `npm run db:setup`: creates the shop's tables in DATABASE_URL and seeds them (db/schema.sql, db/seed.sql). Safe to
// run again. `npm run db:setup -- --reset` drops the tables first, for a fresh start between rehearsals.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const DB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../db');
const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error('Set DATABASE_URL, e.g. DATABASE_URL=postgres://postgres:postgres@localhost:5432/brightside npm run db:setup');
  process.exit(2);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  if (process.argv.includes('--reset')) {
    await client.query('DROP TABLE IF EXISTS invoices, orders, customers, products');
    console.log('Dropped the tables.');
  }
  await client.query(readFileSync(path.join(DB_DIR, 'schema.sql'), 'utf8'));
  await client.query(readFileSync(path.join(DB_DIR, 'seed.sql'), 'utf8'));
  const { rows } = await client.query(`SELECT
    (SELECT count(*) FROM products)::int AS products, (SELECT count(*) FROM customers)::int AS customers,
    (SELECT count(*) FROM orders)::int AS orders, (SELECT count(*) FROM invoices)::int AS invoices`);
  const counts = rows[0];
  console.log(`Ready: ${counts.products} products, ${counts.customers} customers, ${counts.orders} orders, ${counts.invoices} invoices.`);
} finally {
  await client.end();
}
