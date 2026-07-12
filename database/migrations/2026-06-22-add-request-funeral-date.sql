-- Add funeral_date to funeral_requests so code can read/write it
ALTER TABLE funeral_requests ADD COLUMN IF NOT EXISTS funeral_date timestamptz;
