import { COUNTRIES, euros } from './catalog.js';
import { html, raw } from './html.js';
import { SCENARIOS, scenarioInput } from './scenarios.js';

/** The page around every view: header, the view, footer, and the report button when it is configured. */
export function layout({ title, body, widget = '', active = '' }) {
  return `<!doctype html>\n${html`<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Brightside Coffee</title>
<link rel="stylesheet" href="/static/style.css">
</head>
<body data-role="CUSTOMER">
<header class="site-header">
  <a class="brand" href="/"><span class="brand-mark" aria-hidden="true">☀</span> Brightside Coffee</a>
  <nav>
    <a href="/" ${active === 'shop' ? raw('aria-current="page"') : ''}>Shop</a>
    <a href="/checkout" ${active === 'checkout' ? raw('aria-current="page"') : ''}>Checkout</a>
  </nav>
</header>
<main>${body}</main>
<footer class="site-footer">Roasted in Berlin since 2019 · Free sample bag with every order on request</footer>
${raw(widget)}
</body>
</html>`.__html}`;
}

export function homePage(products) {
  return html`<section class="hero">
  <h1>Coffee that makes the morning brighter</h1>
  <p>Small-batch roasts, shipped within two days across Europe.</p>
</section>
<section class="products">
  ${products.map((product) => html`<article class="product" data-sku="${product.sku}">
    <h2>${product.name}</h2>
    <p>${product.description}</p>
    <p class="price">${euros(product.priceCents)}</p>
    <a class="button" href="/checkout?product=${product.sku}">Buy</a>
  </article>`)}
</section>`;
}

const field = (errors, name) => (errors[name] ? html`<span class="field-error" id="${name}-error">${errors[name]}</span>` : '');

/**
 * The checkout form, filled with `form`. `errors` are the customer's mistakes by field; `failure` is a fault of the
 * shop, shown with its reference.
 */
export function checkoutPage({ products, form = {}, errors = {}, failure = null, demo = false, now = new Date() }) {
  const selected = form.product ?? products[0]?.sku;
  return html`<h1>Checkout</h1>
${failure ? html`<div class="alert" role="alert" data-ref="${failure.ref}">
  <strong>Sorry, we could not place your order.</strong>
  <p class="alert-message">${failure.message}</p>
  <p>Reference <code>${failure.ref}</code>. You have not been charged; our team has been told.</p>
  <p class="alert-actions" hidden><button type="button" class="button" data-report-problem>Report this problem</button>
  <span class="alert-hint" data-report-hint></span></p>
</div>` : ''}
${errors.coupon || errors.deliveryDate ? html`<div class="notice" role="status">${errors.coupon ?? errors.deliveryDate}</div>` : ''}
<form class="checkout" method="post" action="/checkout" novalidate>
  <fieldset>
    <legend>Your coffee</legend>
    <label>Coffee
      <select name="product">
        ${products.map((p) => html`<option value="${p.sku}" ${p.sku === selected ? raw('selected') : ''}>${p.name} · ${euros(p.priceCents)}</option>`)}
      </select>${field(errors, 'product')}
    </label>
    <label>Bags (250 g each)
      <input name="quantity" inputmode="numeric" value="${form.quantity ?? '1'}" autocomplete="off">${field(errors, 'quantity')}
    </label>
    <label class="check"><input type="checkbox" name="sample" ${form.sample === 'on' ? raw('checked') : ''}> Add a free sample bag of this month's roast</label>
    <label>Coupon code
      <input name="coupon" value="${form.coupon ?? ''}" autocomplete="off" placeholder="Optional">
    </label>
  </fieldset>
  <fieldset>
    <legend>Delivery</legend>
    <label>Full name
      <input name="name" value="${form.name ?? ''}" autocomplete="name">${field(errors, 'name')}
    </label>
    <label>Email
      <input name="email" type="email" value="${form.email ?? ''}" autocomplete="email">${field(errors, 'email')}
    </label>
    <label>Phone <span class="hint">optional, for the courier</span>
      <input name="phone" type="tel" value="${form.phone ?? ''}" autocomplete="tel">
    </label>
    <label>Address
      <input name="address" value="${form.address ?? ''}" autocomplete="street-address">${field(errors, 'address')}
    </label>
    <label>Country
      <select name="country">
        ${COUNTRIES.map((c) => html`<option value="${c.code}" ${c.code === (form.country ?? 'DE') ? raw('selected') : ''}>${c.name}</option>`)}
      </select>${field(errors, 'country')}
    </label>
    <label>Delivery date <span class="hint">YYYY-MM-DD or DD/MM/YYYY</span>
      <input name="deliveryDate" value="${form.deliveryDate ?? ''}" autocomplete="off" placeholder="DD/MM/YYYY">
    </label>
  </fieldset>
  <button class="button primary" type="submit">Place order</button>
</form>
${demo ? demoPanel(now) : ''}`;
}

/** The presenter's panel: fills the form with a scenario's input (scenarios.js). Only with DEMO_MODE=1. */
function demoPanel(now) {
  const inputs = Object.fromEntries([0, ...SCENARIOS.map((s) => s.n)].map((n) => [n, scenarioInput(n, now)]));
  return html`<aside class="demo-panel" aria-label="Demo scenarios">
  <span class="demo-title">Demo</span>
  <button type="button" data-scenario="0" title="A normal order">OK</button>
  ${SCENARIOS.map((s) => html`<button type="button" data-scenario="${s.n}" title="${s.title}">${s.n}</button>`)}
</aside>
<script type="application/json" id="demo-scenarios">${raw(JSON.stringify(inputs).replace(/</g, '\\u003c'))}</script>
<script src="/static/demo-panel.js" defer></script>`;
}

export function orderPage({ order, product, invoice }) {
  return html`<h1>Thank you!</h1>
<div class="confirmation" data-order="${order.id}">
  <p>Order <strong>${order.id}</strong> is placed. We roast it fresh and deliver it on <strong>${order.deliveryDate}</strong>.</p>
  <table>
    <tr><th>${order.quantity} × ${product?.name ?? order.sku}${order.sampleBag ? ' + free sample bag' : ''}</th><td>${euros(order.subtotalCents)}</td></tr>
    ${order.discountCents ? html`<tr><th>Coupon ${order.couponCode}</th><td>−${euros(order.discountCents)}</td></tr>` : ''}
    <tr><th>Shipping</th><td>${euros(order.shippingCents)}</td></tr>
    <tr class="total"><th>Total</th><td>${euros(order.totalCents)}</td></tr>
  </table>
  ${invoice ? html`<p class="muted">Invoice ${invoice.number}</p>` : ''}
  <a class="button" href="/">Back to the shop</a>
</div>`;
}

export function messagePage(heading, text) {
  return html`<h1>${heading}</h1><p>${text}</p><p><a class="button" href="/">Back to the shop</a></p>`;
}
