-- Add a family member reference to donations so family-recorded donations can be scoped and tracked
alter table donations add column if not exists family_member_id uuid references family_members(id);
create index if not exists idx_donations_family_member on donations(family_member_id);
