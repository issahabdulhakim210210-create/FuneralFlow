-- Migration: ensure projected_attendance column exists on funeral_requests
BEGIN;

ALTER TABLE funeral_requests
  ADD COLUMN IF NOT EXISTS projected_attendance int;

COMMIT;
