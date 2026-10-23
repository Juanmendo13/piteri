-- Pitteri 56 - PDA / KDS schema. Run this FIRST in the Supabase SQL editor, then policies.sql.

CREATE TABLE tables (
  id TEXT PRIMARY KEY,
  zone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'free', -- 'free', 'open', 'paying'
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO tables (id, zone, status) VALUES
  ('S1', 'sala', 'free'),
  ('S2', 'sala', 'free'),
  ('S3', 'sala', 'free'),
  ('S4', 'sala', 'free'),
  ('S5', 'sala', 'free'),
  ('S6', 'sala', 'free'),
  ('S7', 'sala', 'free'),
  ('S8', 'sala', 'free'),
  ('S9', 'sala', 'free'),
  ('S10', 'sala', 'free'),
  ('S11', 'sala', 'free'),
  ('S12', 'sala', 'free'),
  ('B1', 'barra', 'free'),
  ('B2', 'barra', 'free'),
  ('B3', 'barra', 'free'),
  ('B4', 'barra', 'free'),
  ('G1', 'terraza', 'free'),
  ('G2', 'terraza', 'free'),
  ('G3', 'terraza', 'free'),
  ('G4', 'terraza', 'free'),
  ('G5', 'terraza', 'free'),
  ('G6', 'terraza', 'free');

CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id TEXT REFERENCES tables(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'ready', 'served', 'closed'
  total_cents INTEGER NOT NULL DEFAULT 0,
  waiter_id TEXT,   -- who sent the order (see src/pda/waiters.js)
  waiter_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,   -- when the bill was closed ("Conto"), used by the daily report
  payment_method TEXT,     -- 'cash' | 'card' | 'other'
  CONSTRAINT orders_status_check CHECK (status IN ('sent', 'ready', 'served', 'closed')),
  CONSTRAINT orders_payment_method_check CHECK (payment_method IS NULL OR payment_method IN ('cash', 'card', 'other'))
);

CREATE INDEX orders_closed_at_idx ON orders (closed_at);
CREATE INDEX orders_created_at_idx ON orders (created_at);

-- Admin overrides of the carta (sold out / price). The PDA applies them on top of src/catalog.js;
-- the public website does NOT read this table. See the security note in migration-002 / policies.sql.
CREATE TABLE catalog_overrides (
  item_id TEXT PRIMARY KEY CHECK (char_length(item_id) BETWEEN 1 AND 80), -- id in src/catalog.js
  price_cents INTEGER CHECK (price_cents IS NULL OR price_cents BETWEEN 0 AND 100000), -- NULL = base price
  available BOOLEAN NOT NULL DEFAULT TRUE, -- FALSE = "ESAURITO"
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE tables;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE catalog_overrides;

-- ---------------------------------------------------------------------------
-- MIGRATION (only if you ran an EARLIER version of this schema; safe to re-run).
-- On an existing database run ONLY this block (not the CREATE TABLE / INSERT above).
-- Adds the waiter columns and allows the 'ready' status ("pronto per ritiro").
-- On a fresh install the CREATE TABLE above already did all of this, so this
-- block changes nothing.
-- ---------------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter_name TEXT;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_status_check CHECK (status IN ('sent', 'ready', 'served', 'closed'));
-- After this, run policies.sql again (see supabase/README.md).
--
-- Database created BEFORE the "Conto / Admin / Riepilogo" update (closed_at, payment_method,
-- catalog_overrides)? Run supabase/migration-002-cuenta-admin-informes.sql instead of re-running
-- the CREATE TABLE statements above. Do not re-run policies.sql before that migration.