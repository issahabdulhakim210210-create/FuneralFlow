-- Migration: add session meta columns and seed default checklists
-- Run with: psql <CONN> -f 2026-06-18-add-session-meta.sql

BEGIN;

ALTER TABLE funeral_sessions ADD COLUMN IF NOT EXISTS funeral_date timestamptz;
ALTER TABLE funeral_sessions ADD COLUMN IF NOT EXISTS budget_final numeric(12,2);
ALTER TABLE funeral_sessions ADD COLUMN IF NOT EXISTS session_meta jsonb DEFAULT '{}';

-- Seed default checklist items for sessions that currently have no checklist entries
INSERT INTO checklists (session_id, title, completed)
SELECT fs.id, v.title, false
FROM funeral_sessions fs
CROSS JOIN (VALUES
  ('Notify relatives and prepare announcement'),
  ('Set funeral date and confirm venue'),
  ('Arrange mortuary/preservation'),
  ('Organize catering and food arrangements'),
  ('Arrange transport and logistics'),
  ('Assign committees and volunteers'),
  ('Printing: posters/banners/programs'),
  ('Set up donations and fundraising')
) v(title)
WHERE NOT EXISTS (SELECT 1 FROM checklists c WHERE c.session_id = fs.id);

COMMIT;
