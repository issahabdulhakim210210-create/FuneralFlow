-- Track per-donation edit requests so organizers can approve edits
create table if not exists donation_edit_requests (
  id uuid primary key default uuid_generate_v4(),
  donation_id uuid not null references donations(id) on delete cascade,
  requester_user_id uuid references users(id),
  requester_collector_identifier text,
  requester_collector_name text,
  status text default 'PENDING', -- PENDING | APPROVED | REJECTED
  reason text,
  approved_by uuid references users(id),
  approved_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_donation_edit_requests_donation on donation_edit_requests(donation_id, status);
