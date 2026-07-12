-- Migration: add organizer payment phone for invoice payment routing
ALTER TABLE organizers
ADD COLUMN IF NOT EXISTS payment_phone text;
