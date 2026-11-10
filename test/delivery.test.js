import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDeliveryDate } from '../src/checkout/delivery.js';
import { CheckoutInputError } from '../src/checkout/errors.js';

test('an unparseable delivery date is a customer input error', () => {
  for (const bad of ['soon', '31/02/2026', '32/13/2026', 'x/y/z']) {
    assert.throws(() => parseDeliveryDate(bad), CheckoutInputError, bad);
  }
});

test('European and ISO delivery dates parse', () => {
  assert.equal(parseDeliveryDate('14/11/2026'), '2026-11-14');
  assert.equal(parseDeliveryDate('2026-11-14'), '2026-11-14');
});
