import { InvoiceTotalError } from './errors.js';

/**
 * The invoice for a placed order. The total must be what the lines add up to, and never below zero: a negative
 * invoice would pay the customer.
 */
export function createInvoice(order, issuedAt = new Date()) {
  const totalCents = order.subtotalCents - order.discountCents + order.shippingCents;
  if (totalCents !== order.totalCents) throw new InvoiceTotalError(`total does not add up for order ${order.id}`);
  if (totalCents < 0) throw new InvoiceTotalError(`total is negative for order ${order.id}`);
  return {
    orderId: order.id,
    number: `BC-${issuedAt.getUTCFullYear()}-${String(order.id).padStart(6, '0')}`,
    totalCents,
    issuedAt
  };
}
