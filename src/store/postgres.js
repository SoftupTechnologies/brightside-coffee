import pg from 'pg';

const ORDER_COLUMNS = `id, customer_id AS "customerId", product_sku AS sku, quantity, sample_bag AS "sampleBag",
  coupon_code AS "couponCode", address, country, to_char(delivery_date, 'YYYY-MM-DD') AS "deliveryDate",
  subtotal_cents AS "subtotalCents", discount_cents AS "discountCents", shipping_cents AS "shippingCents",
  total_cents AS "totalCents", status, failure, created_at AS "createdAt"`;

/** The shop's data in Postgres (db/schema.sql), at `databaseUrl`. */
export function postgresStore(databaseUrl) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 5 });

  return {
    kind: 'postgres',

    async listProducts() {
      const { rows } = await pool.query(`SELECT sku, name, description, price_cents AS "priceCents", stock
        FROM products ORDER BY price_cents`);
      return rows;
    },

    async saveCustomer({ firstName, lastName, email, phone, country }) {
      const { rows } = await pool.query(`INSERT INTO customers (first_name, last_name, email, phone, country)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, phone = EXCLUDED.phone, country = EXCLUDED.country
        RETURNING id, first_name AS "firstName", last_name AS "lastName", email, phone, country`,
      [firstName, lastName, email, phone, country]);
      return rows[0];
    },

    async createOrder(fields) {
      const { rows } = await pool.query(`INSERT INTO orders (customer_id, product_sku, quantity, sample_bag, coupon_code,
          address, country, delivery_date, subtotal_cents, discount_cents, shipping_cents, total_cents, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
        RETURNING ${ORDER_COLUMNS}`,
      [fields.customerId, fields.sku, fields.quantity, fields.sampleBag, fields.couponCode, fields.address, fields.country,
        fields.deliveryDate, fields.subtotalCents, fields.discountCents, fields.shippingCents, fields.totalCents]);
      return rows[0];
    },

    async saveInvoice(invoice) {
      await pool.query('INSERT INTO invoices (order_id, number, total_cents, issued_at) VALUES ($1, $2, $3, $4)',
        [invoice.orderId, invoice.number, invoice.totalCents, invoice.issuedAt]);
    },

    async setOrderStatus(id, status, failure = null) {
      await pool.query('UPDATE orders SET status = $2, failure = $3 WHERE id = $1', [id, status, failure]);
    },

    async findOrder(id) {
      const { rows } = await pool.query(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $1`, [id]);
      return rows[0] ?? null;
    },

    async findInvoice(orderId) {
      const { rows } = await pool.query(`SELECT order_id AS "orderId", number, total_cents AS "totalCents", issued_at AS "issuedAt"
        FROM invoices WHERE order_id = $1`, [orderId]);
      return rows[0] ?? null;
    },

    /** Throws when the database cannot be reached or is not set up. */
    async check() {
      await pool.query('SELECT 1 FROM orders LIMIT 1');
    },

    close: () => pool.end()
  };
}
