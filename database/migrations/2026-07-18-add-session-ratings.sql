-- Add session tracking to reviews and summary view for service ratings
alter table reviews add column if not exists session_id uuid references funeral_sessions(id) on delete cascade;
create index if not exists idx_reviews_session_service on reviews(session_id, service_id);
create index if not exists idx_reviews_service on reviews(service_id);

-- View for quick access to average ratings and counts per service
create or replace view service_ratings_summary as
select
  service_id,
  round(avg(rating)::numeric,2) as average_rating,
  count(*) as review_count
from reviews
group by service_id;
