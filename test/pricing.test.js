import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCoupon } from '../src/checkout/coupons.js';
import { checkDeliveryDay, parseDeliveryDate, tomorrow } from '../src/checkout/delivery.js';
import { CheckoutInputError, InvoiceTotalError, ParcelError } from '../src/checkout/errors.js';
import { createInvoice } from '../src/checkout/invoice.js';
import { packParcel } from '../src/checkout/parcel.js';
import { formatPhone } from '../src/checkout/phone.js';
import { shippingCost } from '../src/checkout/shipping.js';

test('SAVE5 takes €5 off, never more than the products cost; FREESHIP drops shipping; no code takes nothing', () => {
  assert.deepEqual(applyCoupon('SAVE5', 2500), { discountCents: 500, freeShipping: false });
  assert.deepEqual(applyCoupon(' save5 ', 300), { discountCents: 300, freeShipping: false });
  assert.deepEqual(applyCoupon('FREESHIP', 2500), { discountCents: 0, freeShipping: true });
  assert.deepEqual(applyCoupon('', 2500), { discountCents: 0, freeShipping: false });
  assert.deepEqual(applyCoupon(undefined, 2500), { discountCents: 0, freeShipping: false });
});

test('an unknown coupon is the customer’s mistake', () => {
  assert.throws(() => applyCoupon('COFFEE4FREE', 2500), (error) => error instanceof CheckoutInputError && error.field === 'coupon');
});

test('shipping costs the first bag’s rate plus a little per extra bag', () => {
  assert.equal(shippingCost('DE', 1), 490);
  assert.equal(shippingCost('DE', 3), 590);
  assert.equal(shippingCost('AT', 2), 770);
  assert.equal(shippingCost('IT', 1), 890);
});

test('a parcel is sized by its bags and holds at most twelve', () => {
  assert.equal(packParcel(2).size, 'small');
  assert.equal(packParcel(5).size, 'medium');
  assert.equal(packParcel(12).size, 'large');
  assert.throws(() => packParcel(13), ParcelError);
});

test('a phone number keeps its digits and its leading +', () => {
  assert.equal(formatPhone('+49 30 1234 5678'), '+493012345678');
  assert.equal(formatPhone('(030) 1234-5678'), '03012345678');
});

test('a delivery date in ISO form is kept as it is, and must be tomorrow or later', () => {
  assert.equal(parseDeliveryDate(' 2026-12-01 '), '2026-12-01');
  assert.throws(() => parseDeliveryDate(''), CheckoutInputError);
  assert.equal(tomorrow(new Date('2026-11-10T09:00:00Z')), '2026-11-11');
  assert.equal(checkDeliveryDay('2026-11-11', '2026-11-11'), '2026-11-11');
  assert.throws(() => checkDeliveryDay('2026-11-10', '2026-11-11'), CheckoutInputError);
});

test('an invoice adds up its order and refuses a negative total', () => {
  const order = { id: 1042, subtotalCents: 2500, discountCents: 500, shippingCents: 540, totalCents: 2540 };
  assert.deepEqual(createInvoice(order, new Date('2026-11-10T09:00:00Z')),
    { orderId: 1042, number: 'BC-2026-001042', totalCents: 2540, issuedAt: new Date('2026-11-10T09:00:00Z') });
  assert.throws(() => createInvoice({ ...order, totalCents: 2000 }), /total does not add up for order 1042/);
  assert.throws(() => createInvoice({ ...order, discountCents: 4000, totalCents: -960 }),
    (error) => error instanceof InvoiceTotalError && error.message === 'total is negative for order 1042');
});
