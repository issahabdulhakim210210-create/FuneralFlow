-- Create session_collectors table to track organizer-assist collectors and their approval status
create table if not exists session_collectors (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references funeral_sessions(id) on delete cascade,
  collector_identifier text not null,
  collector_name text not null,
  approved boolean default false,
  approved_by uuid references users(id),
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz default now(),
  unique(session_id, collector_identifier)
);

create index if not exists idx_session_collectors_session on session_collectors(session_id);
create index if not exists idx_session_collectors_approved on session_collectors(session_id, approved);
