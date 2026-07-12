-- Migration: add donation payment metadata and support Paystack MoMo requests
-- Run with: psql <CONN> -f 2026-06-19-add-donations-payment-fields.sql

BEGIN;

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS paid boolean default false,
  ADD COLUMN IF NOT EXISTS momo_number text,
  ADD COLUMN IF NOT EXISTS paystack_reference text;

CREATE INDEX IF NOT EXISTS idx_donations_session_paid ON donations(session_id, type, paid);

COMMIT;
