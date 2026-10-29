-- Add only the columns required by the live POS workflows. Existing area labels are normalized below so filters match the area choices shown in the app.
ALTER TABLE IF EXISTS "SystemSetting" ADD COLUMN IF NOT EXISTS "loginPageConfig" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE IF EXISTS "DeliveryItem" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE IF EXISTS "DeliveryRun" ADD COLUMN IF NOT EXISTS "area" TEXT NOT NULL DEFAULT 'Valencia';
ALTER TABLE IF EXISTS "Booking" ALTER COLUMN "requestedDeliveryDate" DROP NOT NULL;

ALTER TABLE IF EXISTS "customers" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE IF EXISTS "customers" ADD COLUMN IF NOT EXISTS "current_balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE IF EXISTS "customers" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE IF EXISTS "customers" ADD COLUMN IF NOT EXISTS "store_photo_path" TEXT;
ALTER TABLE IF EXISTS "customers" ADD COLUMN IF NOT EXISTS "last_order_at" TIMESTAMP(3);
ALTER TABLE IF EXISTS "customers" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Remember the most recent non-cancelled booking, falling back to the store's
-- registration date so long-idle stores can be deactivated consistently.
UPDATE "customers" c
SET "last_order_at" = COALESCE(
  (SELECT MAX(b."bookingDate") FROM "Booking" b WHERE b."customerId" = c."id" AND b."status" <> 'Cancelled'),
  c."date_joined"::timestamp,
  c."created_at"
)
WHERE c."last_order_at" IS NULL;

CREATE TABLE IF NOT EXISTS "freezer_transactions" (
  "id" TEXT PRIMARY KEY,
  "freezer_id" TEXT NOT NULL REFERENCES "Freezer"("id") ON DELETE RESTRICT,
  "action" TEXT NOT NULL,
  "from_customer_id" TEXT,
  "from_store_name" TEXT,
  "from_area" TEXT,
  "to_customer_id" TEXT,
  "to_store_name" TEXT,
  "to_area" TEXT,
  "reason" TEXT NOT NULL,
  "performed_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "freezer_transactions_freezer_created_idx"
  ON "freezer_transactions" ("freezer_id", "created_at");

ALTER TABLE IF EXISTS "BoDiscrepancy" ALTER COLUMN "disposition" SET DEFAULT 'Pending';
UPDATE "BoDiscrepancy"
SET "disposition" = 'Pending'
WHERE "disposition" IN ('Quarantined', 'Pending Inspection');

ALTER TABLE IF EXISTS "inventory_ledger" ADD COLUMN IF NOT EXISTS "runningQuarantine" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS "products" ADD COLUMN IF NOT EXISTS "flavor" TEXT;
ALTER TABLE IF EXISTS "products" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE IF EXISTS "products" ADD COLUMN IF NOT EXISTS "quarantineStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS "products" ADD COLUMN IF NOT EXISTS "reservedStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS "products" ADD COLUMN IF NOT EXISTS "sku" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "products_sku_key" ON "products" ("sku");

-- Preserve parenthetical store locations as sub-areas while normalizing the legacy area labels.
UPDATE "customers"
SET "sub_area" = COALESCE(NULLIF("sub_area", ''), NULLIF(split_part(split_part("area", '(', 2), ')', 1), '')),
    "area" = CASE
      WHEN lower("area") LIKE '%cabanglasan%' THEN 'Cabanglasan'
      WHEN lower("area") LIKE '%san fernando%' THEN 'San Fernando'
      WHEN lower("area") LIKE '%valencia%' THEN 'Valencia'
      ELSE "area"
    END,
    "route" = CASE
      WHEN lower("area") LIKE '%cabanglasan%' THEN 'Cabanglasan'
      WHEN lower("area") LIKE '%san fernando%' THEN 'San Fernando'
      WHEN lower("area") LIKE '%valencia%' THEN 'Valencia'
      ELSE "route"
    END
WHERE lower("area") LIKE '%cabanglasan%'
   OR lower("area") LIKE '%san fernando%'
   OR lower("area") LIKE '%valencia%';

UPDATE "Freezer"
SET "area" = 'Valencia'
WHERE lower("area") LIKE '%valencia%';
