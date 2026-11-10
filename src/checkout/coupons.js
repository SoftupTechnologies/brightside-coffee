import { CheckoutInputError } from './errors.js';

/**
 * The coupon codes the shop accepts. `amountCents` takes a fixed amount off the order, `percent` a share of the
 * products' price, and `freeShipping` drops the shipping cost.
 */
export const COUPONS = {
  SAVE5: { amountCents: 500 },
  FREESHIP: { freeShipping: true },
  BREW15: { percent: 15 }
};

/**
 * What a coupon takes off an order whose products cost `subtotalCents`: `{ discountCents, freeShipping }`. No code
 * means no discount; a code the shop does not know is the customer's mistake.
 */
export function applyCoupon(code, subtotalCents) {
  const key = (code ?? '').trim().toUpperCase();
  if (key === '') return { discountCents: 0, freeShipping: false };
  const coupon = COUPONS[key];
  if (!coupon) throw new CheckoutInputError('coupon', `We don't know the coupon code ${key}.`);

  let discountCents = 0;
  if (coupon.amountCents) discountCents = Math.min(coupon.amountCents, subtotalCents);
  if (coupon.percent) discountCents = Math.round(subtotalCents * coupon.percent);
  return { discountCents, freeShipping: Boolean(coupon.freeShipping) };
}
