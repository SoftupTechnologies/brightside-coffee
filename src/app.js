import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findProduct } from './catalog.js';
import { CheckoutInputError } from './checkout/errors.js';
import { checkForm, placeOrder } from './checkout/order.js';
import { checkoutPage, homePage, layout, messagePage, orderPage } from './views.js';
import { widgetTags } from './widget.js';

const PUBLIC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const STATIC_TYPES = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const MAX_BODY_BYTES = 32 * 1024;

/** The checkout form's fields, as the browser sends them. */
const FORM_FIELDS = ['product', 'quantity', 'sample', 'coupon', 'firstName', 'lastName', 'email', 'phone', 'address', 'country', 'deliveryDate'];

async function readForm(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('request body too large'), { status: 413 });
    chunks.push(chunk);
  }
  const params = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
  return Object.fromEntries(FORM_FIELDS.map((name) => [name, params.get(name) ?? '']));
}

/**
 * The shop's request handler. `store` holds the data (store/), `logger` writes the log lines (logger.js), `env` is
 * read for DEMO_MODE and the report button, and `build` is the stamp /health reports.
 */
export function createApp({ store, logger, env = process.env, build = null, now = () => new Date() }) {
  const widget = widgetTags(env);
  const demo = env.DEMO_MODE === '1';

  const send = (res, status, body, type = 'text/html; charset=utf-8', headers = {}) => {
    res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...headers });
    res.end(body);
  };
  const page = (res, status, title, body, active) => send(res, status, layout({ title, body, widget, active }));

  async function checkout(req, res) {
    const form = await readForm(req);
    const products = await store.listProducts();
    const errors = checkForm(form);
    if (Object.keys(errors).length > 0) {
      return page(res, 400, 'Checkout', checkoutPage({ products, form, errors, demo, now: now() }), 'checkout');
    }
    try {
      const { order } = await placeOrder(store, form, { now: now() });
      logger.info('order placed', { order: order.id, total_cents: order.totalCents });
      res.writeHead(303, { location: `orders/${order.id}` });
      return res.end();
    } catch (error) {
      if (error instanceof CheckoutInputError) {
        logger.info('checkout refused', { field: error.field });
        return page(res, 400, 'Checkout', checkoutPage({ products, form, errors: { [error.field]: error.message }, demo, now: now() }), 'checkout');
      }
      const ref = logger.error(error);
      const failure = { ref, message: `${error.name}: ${error.message}` };
      return page(res, 500, 'Checkout', checkoutPage({ products, form, failure, demo, now: now() }), 'checkout');
    }
  }

  async function route(req, res) {
    const url = new URL(req.url, 'http://shop.local');
    const { pathname } = url;

    if (req.method === 'GET' && pathname === '/health') {
      await store.check();
      return send(res, 200, JSON.stringify({ ok: true, store: store.kind, build }), 'application/json');
    }
    if (req.method === 'GET' && pathname === '/') {
      return page(res, 200, 'Shop', homePage(await store.listProducts()), 'shop');
    }
    if (req.method === 'GET' && pathname === '/checkout') {
      const product = findProduct(url.searchParams.get('product'))?.sku;
      const form = product ? { product } : {};
      return page(res, 200, 'Checkout', checkoutPage({ products: await store.listProducts(), form, demo, now: now() }), 'checkout');
    }
    if (req.method === 'POST' && pathname === '/checkout') return checkout(req, res);

    const order = /^\/orders\/(\d{1,9})$/.exec(pathname);
    if (req.method === 'GET' && order) {
      const found = await store.findOrder(Number(order[1]));
      if (!found || found.status !== 'placed') return page(res, 404, 'Order', messagePage('No such order', 'We have no placed order with that number.'));
      const invoice = await store.findInvoice(found.id);
      return page(res, 200, 'Order placed', orderPage({ order: found, product: findProduct(found.sku), invoice }));
    }

    if (req.method === 'GET' && pathname.startsWith('/static/')) {
      const name = pathname.slice('/static/'.length);
      const type = STATIC_TYPES[path.extname(name)];
      if (type && /^[a-z0-9-]+\.[a-z]+$/.test(name)) {
        try {
          return send(res, 200, await readFile(path.join(PUBLIC_DIR, name)), type, { 'cache-control': 'max-age=300' });
        } catch {
          // Falls through to the 404.
        }
      }
    }
    return page(res, 404, 'Not found', messagePage('Not found', 'There is nothing at this address.'));
  }

  return async function handle(req, res) {
    try {
      await route(req, res);
    } catch (error) {
      if (error.status === 413) return send(res, 413, 'Request body too large', 'text/plain');
      const ref = logger.error(error);
      if (!res.headersSent) page(res, 500, 'Something went wrong', messagePage('Something went wrong', `Please try again. Reference ${ref}.`));
      else res.end();
    }
  };
}
