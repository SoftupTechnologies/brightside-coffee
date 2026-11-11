import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDeliveryDate } from '../src/checkout/delivery.js';
import { CheckoutInputError } from '../src/checkout/errors.js';

test('delivery dates in both written forms parse to a day', () => {
  assert.equal(parseDeliveryDate('2026-11-14'), '2026-11-14');
  assert.equal(parseDeliveryDate('14/11/2026'), '2026-11-14');
});

test('unparseable delivery dates are a CheckoutInputError, not a RangeError', () => {
  for (const bad of ['tomorrow', '2026-13-45', '31/02/2026', '45/13/2026', 'abc/de/fghi', undefined]) {
    assert.throws(() => parseDeliveryDate(bad), CheckoutInputError, String(bad));
  }
});
