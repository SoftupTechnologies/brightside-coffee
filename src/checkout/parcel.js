import { ParcelError } from './errors.js';

/** The most bags a customer can order at once, and the most the warehouse fits in one parcel. */
export const MAX_BAGS_PER_ORDER = 10;
export const MAX_BAGS_PER_PARCEL = 12;

/** How many bags go in the parcel: the bags ordered, plus the free sample bag when the customer asked for one. */
export function countBags(form) {
  const bags = form.quantity;
  return form.sample === 'on' ? bags + 1 : bags;
}

/** The parcel the warehouse packs for `bags` bags; one parcel per order. */
export function packParcel(bags) {
  if (bags > MAX_BAGS_PER_PARCEL) {
    throw new ParcelError(`a parcel holds at most ${MAX_BAGS_PER_PARCEL} bags, got ${bags}`);
  }
  return { bags, size: bags <= 3 ? 'small' : bags <= 6 ? 'medium' : 'large' };
}
