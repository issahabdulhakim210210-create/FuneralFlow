-- Migration: Add indexes for convenience pricing columns on funeral_requests
BEGIN;

CREATE INDEX IF NOT EXISTS idx_requests_security_count ON funeral_requests(security_count);
CREATE INDEX IF NOT EXISTS idx_requests_usher_count ON funeral_requests(usher_count);
CREATE INDEX IF NOT EXISTS idx_requests_logistics_chairs ON funeral_requests(logistics_chairs);
CREATE INDEX IF NOT EXISTS idx_requests_logistics_tables ON funeral_requests(logistics_tables);
CREATE INDEX IF NOT EXISTS idx_requests_logistics_souvenirs ON funeral_requests(logistics_souvenirs);

COMMIT;
