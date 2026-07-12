-- Rollback: remove pricing fields and indexes
BEGIN;

DROP INDEX IF EXISTS idx_requests_security_count;
DROP INDEX IF EXISTS idx_requests_usher_count;
DROP INDEX IF EXISTS idx_requests_logistics_chairs;
DROP INDEX IF EXISTS idx_requests_logistics_tables;
DROP INDEX IF EXISTS idx_requests_logistics_souvenirs;

ALTER TABLE funeral_requests
  DROP COLUMN IF EXISTS service_pricing_details,
  DROP COLUMN IF EXISTS calculated_total,
  DROP COLUMN IF EXISTS security_count,
  DROP COLUMN IF EXISTS usher_count,
  DROP COLUMN IF EXISTS logistics_chairs,
  DROP COLUMN IF EXISTS logistics_tables,
  DROP COLUMN IF EXISTS logistics_souvenirs;

COMMIT;
