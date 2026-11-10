import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDeliveryDate } from '../src/checkout/delivery.js';
import { CheckoutInputError } from '../src/checkout/errors.js';

test('parses ISO and European delivery dates', () => {
  assert.equal(parseDeliveryDate('2026-11-14'), '2026-11-14');
  assert.equal(parseDeliveryDate('14/11/2026'), '2026-11-14');
});

test('malformed delivery dates are a CheckoutInputError, not a RangeError', () => {
  for (const text of ['tomorrow', '32/13/2026', '2026-13-45', '31/02/2026', '14/11']) {
    assert.throws(() => parseDeliveryDate(text), CheckoutInputError, text);
  }
});
