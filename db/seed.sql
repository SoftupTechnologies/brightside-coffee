-- Two weeks of orders. The BREW15 coupon went live six days ago; every order with it since was rejected because its
-- invoice total came out negative (see the `failure` column).

INSERT INTO products (sku, name, description, price_cents, stock) VALUES
  ('house-blend', 'House Blend', 'Our everyday roast: chocolate, hazelnut and a little caramel. Whole beans, 250 g.', 1250, 120),
  ('ethiopia-guji', 'Ethiopia Guji', 'A light roast from the Guji highlands: jasmine, peach and black tea. Whole beans, 250 g.', 1590, 45),
  ('midnight-decaf', 'Midnight Decaf', 'Swiss-water decaf with all the body and none of the buzz. Ground for filter, 250 g.', 1390, 60)
ON CONFLICT (sku) DO NOTHING;

INSERT INTO customers (id, name, email, phone, country, created_at) VALUES
  (1, 'Anna Becker', 'anna.becker@example.com', '+4930123456', 'DE', now() - interval '40 days'),
  (2, 'Lukas Gruber', 'lukas.gruber@example.com', NULL, 'AT', now() - interval '35 days'),
  (3, 'Sanne de Vries', 'sanne.devries@example.com', '+31201234567', 'NL', now() - interval '30 days'),
  (4, 'Jonas Weber', 'jonas.weber@example.com', '+4989765432', 'DE', now() - interval '21 days'),
  (5, 'Camille Martin', 'camille.martin@example.com', NULL, 'FR', now() - interval '18 days'),
  (6, 'Giulia Rossi', 'giulia.rossi@example.com', '+390612345678', 'IT', now() - interval '7 days')
ON CONFLICT (email) DO NOTHING;

INSERT INTO orders (id, customer_id, product_sku, quantity, sample_bag, coupon_code, address, country, delivery_date,
  subtotal_cents, discount_cents, shipping_cents, total_cents, status, failure, created_at) VALUES
  (1001, 1, 'house-blend', 2, false, NULL, 'Torstraße 12, 10119 Berlin', 'DE', current_date - 10, 2500, 0, 540, 3040, 'placed', NULL, now() - interval '12 days'),
  (1002, 2, 'ethiopia-guji', 1, true, 'SAVE5', 'Neubaugasse 4, 1070 Wien', 'AT', current_date - 9, 1590, 500, 690, 1780, 'placed', NULL, now() - interval '11 days'),
  (1003, 3, 'midnight-decaf', 3, false, 'FREESHIP', 'Prinsengracht 88, 1015 Amsterdam', 'NL', current_date - 8, 4170, 0, 0, 4170, 'placed', NULL, now() - interval '10 days'),
  (1004, 4, 'house-blend', 1, false, NULL, 'Sendlinger Str. 3, 80331 München', 'DE', current_date - 7, 1250, 0, 490, 1740, 'placed', NULL, now() - interval '9 days'),
  (1005, 5, 'ethiopia-guji', 2, false, NULL, '14 rue Oberkampf, 75011 Paris', 'FR', current_date - 6, 3180, 0, 880, 4060, 'placed', NULL, now() - interval '8 days'),
  (1006, 1, 'midnight-decaf', 1, false, 'SAVE5', 'Torstraße 12, 10119 Berlin', 'DE', current_date - 5, 1390, 500, 490, 1380, 'placed', NULL, now() - interval '7 days'),
  (1007, 6, 'house-blend', 2, false, 'BREW15', 'Via del Corso 21, 00186 Roma', 'IT', current_date - 3, 2500, 37500, 980, -34020, 'rejected', 'total is negative for order 1007', now() - interval '6 days'),
  (1008, 2, 'house-blend', 4, false, NULL, 'Neubaugasse 4, 1070 Wien', 'AT', current_date - 2, 5000, 0, 930, 5930, 'placed', NULL, now() - interval '5 days'),
  (1009, 3, 'ethiopia-guji', 1, false, 'BREW15', 'Prinsengracht 88, 1015 Amsterdam', 'NL', current_date - 1, 1590, 23850, 690, -21570, 'rejected', 'total is negative for order 1009', now() - interval '4 days'),
  (1010, 4, 'house-blend', 1, true, 'FREESHIP', 'Sendlinger Str. 3, 80331 München', 'DE', current_date, 1250, 0, 0, 1250, 'placed', NULL, now() - interval '3 days'),
  (1011, 5, 'midnight-decaf', 2, false, 'BREW15', '14 rue Oberkampf, 75011 Paris', 'FR', current_date + 1, 2780, 41700, 880, -38040, 'rejected', 'total is negative for order 1011', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO invoices (order_id, number, total_cents, issued_at)
SELECT id, 'BC-' || to_char(created_at, 'YYYY') || '-' || lpad(id::text, 6, '0'), total_cents, created_at
FROM orders WHERE status = 'placed'
ON CONFLICT (order_id) DO NOTHING;

-- New rows continue after the seeded ids.
SELECT setval(pg_get_serial_sequence('customers', 'id'), (SELECT max(id) FROM customers));
SELECT setval(pg_get_serial_sequence('orders', 'id'), (SELECT max(id) FROM orders));
SELECT setval(pg_get_serial_sequence('invoices', 'id'), (SELECT max(id) FROM invoices));
