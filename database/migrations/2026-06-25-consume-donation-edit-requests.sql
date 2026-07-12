-- Mark donation edit requests as consumed after a successful edit
alter table donation_edit_requests
  add column if not exists consumed_at timestamptz;

-- Optional: keep a record that the request state moved to CONSUMED; existing code uses text status values
-- No further changes required here; server will set status='CONSUMED' and consumed_at when used.
