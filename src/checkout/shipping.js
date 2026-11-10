import { CheckoutInputError } from './errors.js';

/**
 * Shipping rates per country, in cents: `standard` for the first bag and `perExtraBag` for each bag after it.
 */
export const SHIPPING_RATES = {
  DE: { standard: 490, perExtraBag: 50 },
  AT: { standard: 690, perExtraBag: 80 },
  NL: { standard: 690, perExtraBag: 80 },
  FR: { standard: 790, perExtraBag: 90 },
  IT: { standard: 890, perExtraBag: 90 }
};

/** What shipping `bags` bags to `country` (a code of catalog.js COUNTRIES) costs, in cents. */
export function shippingCost(country, bags) {
  const rate = SHIPPING_RATES[country];
  if (!rate) throw new CheckoutInputError('country', 'Sorry, we do not deliver to that country yet.');
  return rate.standard + Math.max(0, bags - 1) * rate.perExtraBag;
}
