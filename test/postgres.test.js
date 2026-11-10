// Runs against a real Postgres only when TEST_DATABASE_URL is set (CI sets it); each run uses a schema of its own
// and drops it after.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { placeOrder } from '../src/checkout/order.js';
import { normalOrder } from '../src/scenarios.js';
import { postgresStore } from '../src/store/postgres.js';

const url = process.env.TEST_DATABASE_URL?.trim();
const sql = (name) => readFileSync(new URL(`../db/${name}`, import.meta.url), 'utf8');

test('the schema and seed load, and an order is stored with its invoice', { skip: !url && 'TEST_DATABASE_URL is not set' }, async (t) => {
  const schema = `brightside_test_${process.pid}`;
  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  await admin.query(`CREATE SCHEMA ${schema}`);
  t.after(async () => {
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  });
  await admin.query(`SET search_path TO ${schema}`);
  await admin.query(sql('schema.sql'));
  await admin.query(sql('seed.sql'));
  await admin.query(sql('seed.sql'));

  const rejected = await admin.query(`SELECT id, coupon_code, total_cents, failure FROM orders WHERE status = 'rejected' ORDER BY id`);
  assert.deepEqual(rejected.rows.map((r) => r.coupon_code), ['BREW15', 'BREW15', 'BREW15']);
  assert.ok(rejected.rows.every((r) => r.total_cents < 0 && r.failure === `total is negative for order ${r.id}`));

  const withPath = new URL(url);
  withPath.searchParams.set('options', `-c search_path=${schema}`);
  const store = postgresStore(withPath.toString());
  t.after(() => store.close());
  await store.check();
  const { order, invoice } = await placeOrder(store, normalOrder());
  assert.equal(order.id, 1012);
  const saved = await store.findOrder(order.id);
  assert.equal(saved.status, 'placed');
  assert.equal(saved.totalCents, 3040);
  assert.deepEqual(await store.findInvoice(order.id), { orderId: 1012, number: invoice.number, totalCents: 3040, issuedAt: invoice.issuedAt });
});
