-- Migration: Add pricing and logistics columns to funeral_requests
-- Adds JSONB blob for service pricing details and numeric total
BEGIN;

ALTER TABLE funeral_requests
  ADD COLUMN IF NOT EXISTS service_pricing_details jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE funeral_requests
  ADD COLUMN IF NOT EXISTS calculated_total numeric(12,2) DEFAULT 0;

-- Optional convenience columns for easier querying/reporting
ALTER TABLE funeral_requests
  ADD COLUMN IF NOT EXISTS security_count int;

ALTER TABLE funeral_requests
  ADD COLUMN IF NOT EXISTS usher_count int;

ALTER TABLE funeral_requests
  ADD COLUMN IF NOT EXISTS logistics_chairs int;

ALTER TABLE funeral_requests
  ADD COLUMN IF NOT EXISTS logistics_tables int;

ALTER TABLE funeral_requests
  ADD COLUMN IF NOT EXISTS logistics_souvenirs int;

COMMIT;
