-- Add beneficiary fields to donations so donations can be assigned to a relative or family recipient
alter table donations add column if not exists relative_name text;
alter table donations add column if not exists relative_relationship text;
