-- Add missing contact and timestamp fields to donations table
-- These columns are needed for recording donor contact info and check-in times

BEGIN;

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS donor_phone text,
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_donations_donor_phone ON donations(donor_phone);
CREATE INDEX IF NOT EXISTS idx_donations_checked_in ON donations(checked_in_at);

COMMIT;
