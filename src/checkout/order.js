import { COUNTRIES, findProduct } from '../catalog.js';
import { applyCoupon } from './coupons.js';
import { checkDeliveryDay, parseDeliveryDate, tomorrow } from './delivery.js';
import { createInvoice } from './invoice.js';
import { countBags, MAX_BAGS_PER_ORDER, packParcel } from './parcel.js';
import { formatPhone } from './phone.js';
import { shippingCost } from './shipping.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * What is wrong with the checkout form as the customer sent it, by field; empty when every field can be read. The
 * form's values are the strings the browser sent.
 */
export function checkForm(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Tell us who the coffee is for.';
  if (!EMAIL.test(form.email?.trim() ?? '')) errors.email = 'Enter an email address, such as anna@example.com.';
  if (!findProduct(form.product)) errors.product = 'Pick a coffee.';
  const quantity = Number(form.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_BAGS_PER_ORDER) {
    errors.quantity = `Order 1 to ${MAX_BAGS_PER_ORDER} bags.`;
  }
  if (!form.address?.trim()) errors.address = 'Tell us where to deliver.';
  if (!COUNTRIES.some((country) => country.code === form.country)) errors.country = 'Pick a country.';
  return errors;
}

/**
 * Places the order of a checked form: works out the parcel, the delivery day and the price, stores the customer and
 * the order, and issues the invoice. An order whose invoice cannot be issued is kept as rejected, with the reason.
 */
export async function placeOrder(store, form, { now = new Date() } = {}) {
  const product = findProduct(form.product);
  const bags = countBags(form);
  const parcel = packParcel(bags);
  const deliveryDate = checkDeliveryDay(parseDeliveryDate(form.deliveryDate), tomorrow(now));
  const phone = formatPhone(form.phone ?? '');

  const quantity = Number(form.quantity);
  const subtotalCents = product.priceCents * quantity;
  const coupon = applyCoupon(form.coupon, subtotalCents);
  const shippingCents = coupon.freeShipping ? 0 : shippingCost(form.country, bags);
  const totalCents = subtotalCents - coupon.discountCents + shippingCents;

  const customer = await store.saveCustomer({
    name: form.name.trim(), email: form.email.trim().toLowerCase(), phone, country: form.country
  });
  const order = await store.createOrder({
    customerId: customer.id,
    sku: product.sku,
    quantity,
    sampleBag: form.sample === 'on',
    couponCode: form.coupon?.trim().toUpperCase() || null,
    address: form.address.trim(),
    country: form.country,
    deliveryDate,
    subtotalCents,
    discountCents: coupon.discountCents,
    shippingCents,
    totalCents
  });

  try {
    const invoice = createInvoice(order, now);
    await store.saveInvoice(invoice);
    await store.setOrderStatus(order.id, 'placed');
    return { order: { ...order, status: 'placed' }, invoice, parcel, product, customer };
  } catch (error) {
    await store.setOrderStatus(order.id, 'rejected', error.message);
    throw error;
  }
}
