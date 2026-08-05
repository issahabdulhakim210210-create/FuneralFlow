alter table documents add column if not exists collector_name text;
alter table documents add column if not exists collector_identifier text;
create index if not exists idx_documents_collector_identifier on documents(collector_identifier);
create index if not exists idx_documents_document_type on documents(document_type);
