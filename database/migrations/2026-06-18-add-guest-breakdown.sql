-- Migration: ensure guest_breakdown column exists on funeral_requests
BEGIN;

ALTER TABLE funeral_requests
  ADD COLUMN IF NOT EXISTS guest_breakdown jsonb NOT NULL DEFAULT '{}';

COMMIT;
