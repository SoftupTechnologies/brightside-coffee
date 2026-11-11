import { CheckoutInputError } from './errors.js';

/**
 * The delivery date as a calendar day, `YYYY-MM-DD`. Customers type it as 2026-11-14 or, as most of Europe writes
 * it, 14/11/2026.
 */
export function parseDeliveryDate(text) {
  const value = (text ?? '').trim();
  if (value === '') throw new CheckoutInputError('deliveryDate', 'Pick a delivery date.');
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const european = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  const date = european ? new Date(Date.UTC(+european[3], +european[2] - 1, +european[1])) : new Date(value);
  if (Number.isNaN(date.getTime()) || (european && date.getUTCDate() !== +european[1])) {
    throw new CheckoutInputError('deliveryDate', 'Enter the delivery date as 2026-11-14 or 14/11/2026.');
  }
  return date.toISOString().slice(0, 10);
}

/** Refuses a day before `earliest` (a `YYYY-MM-DD` day): the roastery needs a day to roast and pack. */
export function checkDeliveryDay(day, earliest) {
  if (day < earliest) throw new CheckoutInputError('deliveryDate', `We can deliver from ${earliest} on.`);
  return day;
}

/** Tomorrow, as a `YYYY-MM-DD` day in UTC. */
export function tomorrow(now = new Date()) {
  return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
