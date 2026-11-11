import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDeliveryDate } from '../src/checkout/delivery.js';
import { CheckoutInputError } from '../src/checkout/errors.js';

test('parseDeliveryDate reads ISO and day/month/year dates', () => {
  assert.equal(parseDeliveryDate('2026-11-14'), '2026-11-14');
  assert.equal(parseDeliveryDate('14/11/2026'), '2026-11-14');
  assert.equal(parseDeliveryDate('4/1/2027'), '2027-01-04');
});

test('parseDeliveryDate refuses empty, malformed and out-of-range dates as input errors', () => {
  for (const input of [undefined, '', '  ', 'tomorrow', '11/14/2026', '31/02/2026', '2026-13-45', '2026-11-14T99:00', '99999999/1/1']) {
    assert.throws(() => parseDeliveryDate(input), CheckoutInputError, String(input));
  }
});
