/**
 * Something the customer typed that the shop cannot take, such as an unknown coupon. The checkout shows it next to
 * the form; it is not a fault of the shop, so it is not logged as an error.
 */
export class CheckoutInputError extends Error {
  constructor(field, message) {
    super(message);
    this.name = 'CheckoutInputError';
    this.field = field;
  }
}

/** An invoice the shop refuses to issue because its amounts do not add up. */
export class InvoiceTotalError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvoiceTotalError';
  }
}

/** An order the warehouse cannot pack. */
export class ParcelError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ParcelError';
  }
}
