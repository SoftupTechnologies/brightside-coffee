import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalOrder } from '../src/scenarios.js';
import { startShop } from './helpers.js';

test('the health check answers with the store and the build', async (t) => {
  const shop = await startShop();
  t.after(shop.close);
  const response = await shop.get('/health');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, store: 'memory', build: { commit: 'test', dirty: false, buildId: 'test' } });
});

test('the shop page lists every coffee with its price and a link to buy it', async (t) => {
  const shop = await startShop();
  t.after(shop.close);
  const page = await (await shop.get('/')).text();
  for (const [name, price, sku] of [['House Blend', '€12.50', 'house-blend'], ['Ethiopia Guji', '€15.90', 'ethiopia-guji'], ['Midnight Decaf', '€13.90', 'midnight-decaf']]) {
    assert.ok(page.includes(name), name);
    assert.ok(page.includes(price), price);
    assert.ok(page.includes(`href="checkout?product=${sku}"`), sku);
  }
});

test('the checkout preselects the coffee it was opened for', async (t) => {
  const shop = await startShop();
  t.after(shop.close);
  const page = await (await shop.get('/checkout?product=ethiopia-guji')).text();
  assert.match(page, /<option value="ethiopia-guji" selected>/);
  assert.match(page, /<form class="checkout" method="post" action="checkout"/);
});

test('a normal order is placed, invoiced and shown', async (t) => {
  const shop = await startShop();
  t.after(shop.close);
  const response = await shop.post('/checkout', normalOrder());
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'orders/1001', 'relative, so it works under BASE_PATH too');

  const page = await (await shop.get('/orders/1001')).text();
  assert.ok(page.includes('Order <strong>1001</strong> is placed'));
  assert.ok(page.includes('€30.40'), 'two bags of House Blend, €25.00, and €5.40 shipping to Germany');
  assert.match(page, /Invoice BC-\d{4}-001001/);

  const [order] = shop.store.orders;
  assert.equal(order.status, 'placed');
  assert.equal(order.totalCents, 3040);
  assert.equal(shop.store.customers[0].phone, '+493012345678');
  assert.deepEqual(shop.errors(), []);
  assert.ok(shop.lines.includes('INFO order placed order=1001 total_cents=3040'));
});

test('the SAVE5 and FREESHIP coupons take their part off the total', async (t) => {
  const shop = await startShop();
  t.after(shop.close);
  assert.equal((await shop.post('/checkout', { ...normalOrder(), coupon: 'save5' })).status, 303);
  assert.equal((await shop.post('/checkout', { ...normalOrder(), coupon: 'FREESHIP' })).status, 303);
  const [save5, freeship] = shop.store.orders;
  assert.deepEqual([save5.discountCents, save5.shippingCents, save5.totalCents], [500, 540, 2540]);
  assert.deepEqual([freeship.discountCents, freeship.shippingCents, freeship.totalCents], [0, 0, 2500]);
});

test("the customer's mistakes are shown on the form and are not logged as errors", async (t) => {
  const shop = await startShop();
  t.after(shop.close);

  const missing = await shop.post('/checkout', { ...normalOrder(), name: ' ', email: 'not-an-email', quantity: '0' });
  assert.equal(missing.status, 400);
  const page = await missing.text();
  assert.ok(page.includes('Tell us who the coffee is for.'));
  assert.ok(page.includes('Enter an email address'));
  assert.ok(page.includes('Order 1 to 10 bags.'));

  const coupon = await shop.post('/checkout', { ...normalOrder(), coupon: 'nope' });
  assert.equal(coupon.status, 400);
  assert.ok((await coupon.text()).includes("We don&#39;t know the coupon code NOPE."));

  const past = await shop.post('/checkout', { ...normalOrder(), deliveryDate: '2020-01-01' });
  assert.equal(past.status, 400);
  assert.match(await past.text(), /We can deliver from \d{4}-\d{2}-\d{2} on\./);

  assert.deepEqual(shop.store.orders, []);
  assert.deepEqual(shop.errors(), []);
});

test("a fault of the shop shows the message and a reference, and logs one ERROR line with the stack", async (t) => {
  const shop = await startShop({
    store: { async saveCustomer() { throw new Error('the customers table is locked'); } }
  });
  t.after(shop.close);
  const response = await shop.post('/checkout', normalOrder());
  assert.equal(response.status, 500);
  const page = await response.text();
  const ref = /data-ref="([A-Z0-9]{6})"/.exec(page)?.[1];
  assert.ok(ref, 'the error box carries the reference');
  assert.ok(page.includes('<p class="alert-message">Error: the customers table is locked</p>'));
  assert.ok(page.includes(`Reference <code>${ref}</code>`));

  const errors = shop.errors();
  assert.equal(errors.length, 1);
  const [first, ...frames] = errors[0].split('\n');
  assert.equal(first, `ERROR ref=${ref} Error: the customers table is locked`);
  assert.ok(frames.length > 0 && frames.every((line) => /^ {4}at /.test(line)), errors[0]);
});

test('the demo panel is on the checkout only with DEMO_MODE=1', async (t) => {
  const plain = await startShop({ env: { AKESO_PROJECT_KEY: 'not-a-key' } }); // a refused key leaves the button out, whatever akeso.json holds
  t.after(plain.close);
  assert.ok(!(await (await plain.get('/checkout')).text()).includes('demo-panel'));

  const demo = await startShop({ env: { DEMO_MODE: '1' } });
  t.after(demo.close);
  const page = await (await demo.get('/checkout')).text();
  assert.equal([...page.matchAll(/data-scenario="(\d)"/g)].map((m) => m[1]).join(','), '0,1,2,3,4,5');
  const inputs = JSON.parse(/<script type="application\/json" id="demo-scenarios">(.*?)<\/script>/s.exec(page)[1]);
  assert.deepEqual(Object.keys(inputs), ['0', '1', '2', '3', '4', '5']);
  assert.equal(inputs[1].coupon, 'BREW15');
});

test('the report button is on every page when the Akeso service and project key are set', async (t) => {
  const plain = await startShop({ env: { AKESO_PROJECT_KEY: 'not-a-key' } }); // a refused key leaves the button out, whatever akeso.json holds
  t.after(plain.close);
  assert.ok(!(await (await plain.get('/')).text()).includes('Akeso.mount'));

  const env = { AKESO_SERVICE_URL: 'http://localhost:3000/', AKESO_PROJECT_KEY: 'shpk_demo123' };
  const shop = await startShop({ env });
  t.after(shop.close);
  for (const path of ['/', '/checkout']) {
    const page = await (await shop.get(path)).text();
    assert.ok(page.includes('<script src="http://localhost:3000/widget/0.3.0/akeso-widget.js" integrity="sha384-'), path);
    assert.ok(page.includes(`Akeso.mount(document.getElementById('akeso'), {"service":"http://localhost:3000","project":"shpk_demo123"});`), path);
  }
});

test('an unknown page is a 404 and static files are served', async (t) => {
  const shop = await startShop();
  t.after(shop.close);
  assert.equal((await shop.get('/nothing-here')).status, 404);
  assert.equal((await shop.get('/orders/9999')).status, 404);
  assert.equal((await shop.get('/static/../package.json')).status, 404);
  const css = await shop.get('/static/style.css');
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /^text\/css/);
});

test('under BASE_PATH (a proxy serving the shop at /demo) every page names its base, so its relative links stay under it', async (t) => {
  const { layout } = await import('../src/views.js');
  assert.match(layout({ title: 'x', body: '', base: '/demo/' }), /<base href="\/demo\/">/);
  assert.match(layout({ title: 'x', body: '' }), /<base href="\/">/);
});
