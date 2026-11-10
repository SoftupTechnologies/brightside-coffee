// The products Brightside Coffee sells and the countries it delivers to. The database holds the same products
// (db/seed.sql); without a database the shop runs on this list alone.

export const PRODUCTS = [
  {
    sku: 'house-blend',
    name: 'House Blend',
    description: 'Our everyday roast: chocolate, hazelnut and a little caramel. Whole beans, 250 g.',
    priceCents: 1250,
    stock: 120
  },
  {
    sku: 'ethiopia-guji',
    name: 'Ethiopia Guji',
    description: 'A light roast from the Guji highlands: jasmine, peach and black tea. Whole beans, 250 g.',
    priceCents: 1590,
    stock: 45
  },
  {
    sku: 'midnight-decaf',
    name: 'Midnight Decaf',
    description: 'Swiss-water decaf with all the body and none of the buzz. Ground for filter, 250 g.',
    priceCents: 1390,
    stock: 60
  }
];

/** The countries the checkout offers, in the order the select lists them. */
export const COUNTRIES = [
  { code: 'DE', name: 'Germany' },
  { code: 'AT', name: 'Austria' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'CH', name: 'Switzerland' }
];

export const findProduct = (sku) => PRODUCTS.find((product) => product.sku === sku) ?? null;

/** Cents as euros for people: 1250 is "€12.50". */
export const euros = (cents) => `€${(cents / 100).toFixed(2)}`;
