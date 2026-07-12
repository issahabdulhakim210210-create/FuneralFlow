-- Add collector fields to donations so collectors can record donations
alter table donations add column if not exists collector_name text;
alter table donations add column if not exists collector_identifier text;
