import { CheckoutInputError } from './errors.js';

/**
 * The delivery date as a calendar day, `YYYY-MM-DD`. Customers type it as 2026-11-14 or, as most of Europe writes
 * it, 14/11/2026.
 */
export function parseDeliveryDate(text) {
  const value = (text ?? '').trim();
  if (value === '') throw new CheckoutInputError('deliveryDate', 'Pick a delivery date.');
  let year, month, day;
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) [, year, month, day] = m;
  else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value))) [, day, month, year] = m;
  else {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new CheckoutInputError('deliveryDate', 'Enter the delivery date as 2026-11-14 or 14/11/2026.');
    return date.toISOString().slice(0, 10);
  }
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) {
    throw new CheckoutInputError('deliveryDate', 'Enter a real delivery date, like 2026-11-14 or 14/11/2026.');
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
