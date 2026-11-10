import { PRODUCTS } from '../catalog.js';

/**
 * The shop's data in memory, for the tests and for running without a database. It has the same methods as the
 * Postgres store (store/postgres.js) and forgets everything when the process ends.
 */
export function memoryStore() {
  const customers = [];
  const orders = [];
  const invoices = [];
  let nextOrderId = 1001;

  return {
    kind: 'memory',
    customers,
    orders,
    invoices,

    async listProducts() {
      return PRODUCTS.map((product) => ({ ...product }));
    },

    async saveCustomer({ name, email, phone, country }) {
      let customer = customers.find((c) => c.email === email);
      if (!customer) {
        customer = { id: customers.length + 1, email, createdAt: new Date() };
        customers.push(customer);
      }
      Object.assign(customer, { name, phone, country });
      return { ...customer };
    },

    async createOrder(fields) {
      const order = { id: nextOrderId++, ...fields, status: 'pending', failure: null, createdAt: new Date() };
      orders.push(order);
      return { ...order };
    },

    async saveInvoice(invoice) {
      invoices.push({ ...invoice });
    },

    async setOrderStatus(id, status, failure = null) {
      const order = orders.find((o) => o.id === id);
      if (order) Object.assign(order, { status, failure });
    },

    async findOrder(id) {
      const order = orders.find((o) => o.id === id);
      return order ? { ...order } : null;
    },

    async findInvoice(orderId) {
      const invoice = invoices.find((i) => i.orderId === orderId);
      return invoice ? { ...invoice } : null;
    },

    async check() {},

    async close() {}
  };
}
