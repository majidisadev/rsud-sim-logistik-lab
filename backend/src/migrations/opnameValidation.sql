-- Stock opname per-aspect validation (schema only; backfill runs once from runMigrations)

ALTER TABLE stock_opnames DROP CONSTRAINT IF EXISTS stock_opnames_validation_status_check;
ALTER TABLE stock_opnames ADD CONSTRAINT stock_opnames_validation_status_check
  CHECK (validation_status IN ('Belum', 'Disetujui', 'Tidak Disetujui', 'Selesai'));

ALTER TABLE stock_opname_items
  ADD COLUMN IF NOT EXISTS temperature_validation_status VARCHAR(20) DEFAULT 'Belum';

ALTER TABLE stock_opname_items
  ADD COLUMN IF NOT EXISTS stock_validation_status VARCHAR(20) NULL;

ALTER TABLE stock_opname_items
  ADD COLUMN IF NOT EXISTS expiration_validation_status VARCHAR(20) NULL;

ALTER TABLE stock_opname_item_lots
  ADD COLUMN IF NOT EXISTS stock_validation_status VARCHAR(20) DEFAULT 'Belum';

ALTER TABLE stock_opname_item_lots
  ADD COLUMN IF NOT EXISTS expiration_validation_status VARCHAR(20) DEFAULT 'Belum';

ALTER TABLE stock_opname_item_lots
  ADD COLUMN IF NOT EXISTS stock_adjustment_posted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE stock_opname_items
  ADD COLUMN IF NOT EXISTS legacy_stock_adjustment_posted BOOLEAN NOT NULL DEFAULT FALSE;
