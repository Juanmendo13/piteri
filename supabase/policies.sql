-- Pitteri 56 - PDA / KDS row level security. Run this AFTER schema.sql.
--
-- !! IMPORTANT !!
-- The anon key ships inside the public JS bundle (/assets/pda.js), so anyone can
-- extract it. These policies and grants are the ONLY real barrier to the data.
-- The PINs on the PDA are just a screen lock for the waiters, they are NOT security.
-- Do not store anything sensitive in these tables (no phones, payments; the only
-- personal data is the waiter's first name on each order).
--
-- What the anon key can do after this script:
--   tables : SELECT, UPDATE of status + updated_at only (no insert, no delete)
--   orders : SELECT, INSERT with status 'sent' (+ waiter_id, waiter_name),
--            UPDATE of status, closed_at and payment_method only
--            ('sent' -> 'ready' -> 'served' -> 'closed' + how/when it was paid)
--   catalog_overrides : SELECT, INSERT, UPDATE of price_cents / available / updated_at
--   nothing can be deleted anywhere.
--
-- !! catalog_overrides is writable by ANYONE who has the anon key !!
-- The "Admin" PIN of the PDA is only a screen lock (it ships in the public JS). So anyone with the
-- public anon key can mark products as sold out or change the price the PDA uses for NEW orders.
-- Limits: price_cents must be NULL or between 0 and 100000, no delete, no other column, sent orders
-- keep their price, and the public website never reads this table. Add Supabase Auth if you need
-- real protection.
--
-- Safe to re-run (policies are dropped and recreated). Run it again after the
-- waiter / 'ready' migration at the end of schema.sql, so the new columns and the
-- 'ready' status are allowed. On a database created before closed_at / payment_method /
-- catalog_overrides existed, run migration-002-cuenta-admin-informes.sql FIRST.

ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_overrides ENABLE ROW LEVEL SECURITY;

-- Start from zero privileges, then grant back only what is needed.
-- RLS policies work on rows; GRANTs below restrict which COLUMNS can be written.
REVOKE ALL ON tables FROM anon;
REVOKE ALL ON orders FROM anon;
REVOKE ALL ON catalog_overrides FROM anon;

GRANT SELECT ON tables TO anon;
GRANT UPDATE (status, updated_at) ON tables TO anon;

GRANT SELECT ON orders TO anon;
GRANT INSERT (table_id, items, status, total_cents, waiter_id, waiter_name) ON orders TO anon;
GRANT UPDATE (status, closed_at, payment_method) ON orders TO anon;

GRANT SELECT ON catalog_overrides TO anon;
GRANT INSERT (item_id, price_cents, available, updated_at) ON catalog_overrides TO anon;
GRANT UPDATE (price_cents, available, updated_at) ON catalog_overrides TO anon;

-- tables ---------------------------------------------------------------------
DROP POLICY IF EXISTS "tables_select" ON tables;
CREATE POLICY "tables_select" ON tables
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "tables_update_status" ON tables;
CREATE POLICY "tables_update_status" ON tables
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (status IN ('free', 'open', 'paying'));

-- orders ---------------------------------------------------------------------
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

-- catalog_overrides ----------------------------------------------------------
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
