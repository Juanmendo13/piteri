-- Pitteri 56 - MIGRATION 002: cierre de cuenta (Conto), admin de carta, informes del dia.
--
-- Run this ONCE in the Supabase SQL Editor on an existing database (schema.sql + policies.sql
-- already executed). It is idempotent and self-contained: running it again changes nothing.
-- Fresh installs do NOT need it (schema.sql and policies.sql already include everything).
--
-- What it does:
--   1. orders: new columns closed_at (when the bill was closed) and payment_method
--      ('cash' | 'card' | 'other'), used by the "Conto" screen and the "Riepilogo" report.
--   2. New table catalog_overrides (sold out + price changes made from the PDA "Admin" screen),
--      with realtime.
--   3. Row level security + column-level grants for both, same style as policies.sql.
--      Nothing can be deleted by anon.
--
-- !! SECURITY WARNING (catalog_overrides) !!
-- The anon key is public (it ships inside /assets/pda.js). The "Admin" PIN of the PDA is only a
-- screen lock, so ANYONE who has the anon key can write catalog_overrides: mark products as
-- sold out or change the price the PDA uses for NEW orders. Limits that remain: only
-- price_cents / available can be changed, price must be NULL or between 0 and 100000 cents,
-- nothing can be deleted, orders already sent keep their price, and the public website does not
-- read this table at all. If this is not acceptable, add real authentication (Supabase Auth)
-- before relying on it.

-- 1. orders: closing data ----------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('cash', 'card', 'other'));

-- Reports read closed orders of a day: index the two timestamps they filter on.
CREATE INDEX IF NOT EXISTS orders_closed_at_idx ON orders (closed_at);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at);

-- 2. catalog_overrides -------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalog_overrides (
  item_id TEXT PRIMARY KEY CHECK (char_length(item_id) BETWEEN 1 AND 80), -- id in src/catalog.js
  price_cents INTEGER CHECK (price_cents IS NULL OR price_cents BETWEEN 0 AND 100000), -- NULL = base price
  available BOOLEAN NOT NULL DEFAULT TRUE, -- FALSE = "ESAURITO"
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Realtime (no error if the table is already in the publication).
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE catalog_overrides;
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- already a member
  WHEN undefined_object THEN NULL;  -- publication missing (not a Supabase project): skip
END
$$;

-- 3. Row level security and grants -------------------------------------------
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_overrides ENABLE ROW LEVEL SECURITY;

-- orders: same as policies.sql plus UPDATE of closed_at / payment_method.
REVOKE ALL ON orders FROM anon;
GRANT SELECT ON orders TO anon;
GRANT INSERT (table_id, items, status, total_cents, waiter_id, waiter_name) ON orders TO anon;
GRANT UPDATE (status, closed_at, payment_method) ON orders TO anon;

DROP POLICY IF EXISTS "orders_select" ON orders;
CREATE POLICY "orders_select" ON orders
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "orders_insert_sent" ON orders;
CREATE POLICY "orders_insert_sent" ON orders
  FOR INSERT TO anon
  WITH CHECK (status = 'sent');

DROP POLICY IF EXISTS "orders_update_status" ON orders;
CREATE POLICY "orders_update_status" ON orders
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (status IN ('sent', 'ready', 'served', 'closed'));

-- catalog_overrides: select / insert / update only, no delete.
REVOKE ALL ON catalog_overrides FROM anon;
GRANT SELECT ON catalog_overrides TO anon;
GRANT INSERT (item_id, price_cents, available, updated_at) ON catalog_overrides TO anon;
GRANT UPDATE (price_cents, available, updated_at) ON catalog_overrides TO anon;

DROP POLICY IF EXISTS "catalog_overrides_select" ON catalog_overrides;
CREATE POLICY "catalog_overrides_select" ON catalog_overrides
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "catalog_overrides_insert" ON catalog_overrides;
CREATE POLICY "catalog_overrides_insert" ON catalog_overrides
  FOR INSERT TO anon
  WITH CHECK (price_cents IS NULL OR price_cents BETWEEN 0 AND 100000);

DROP POLICY IF EXISTS "catalog_overrides_update" ON catalog_overrides;
CREATE POLICY "catalog_overrides_update" ON catalog_overrides
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (price_cents IS NULL OR price_cents BETWEEN 0 AND 100000);

-- No DELETE policy and no DELETE grant: deleting is impossible for anon.
