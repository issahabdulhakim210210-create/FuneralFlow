import { asyncHandler } from '../utils/errors.js';
import { query } from '../config/db.js';
import { Query } from 'pg';

/**
 * Submit a rating and review for a service in a completed session
 * Only family members can rate services from their own sessions
 */
export const submitServiceRating = asyncHandler(async (req: any, res: any) => {
  const { sessionId, serviceId } = req.params;
  const { rating, comment } = req.body;
  const user = req.user;

  if (!sessionId || !serviceId || !rating) {
    return res.status(400).json({ error: 'sessionId, serviceId, and rating are required' });
  }

  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
  }

  // Verify family member access to session
  const familyMember = (await query(
    'select id from family_members where user_id=$1 limit 1',
    [user.id]
  )).rows[0];

  if (!familyMember) {
    return res.status(403).json({ error: 'Family member profile not found' });
  }

  const session = (await query(
    `select id, status, family_member_id from funeral_sessions
     where (id::text = $1 or session_code = $1) and (family_member_id=$2 or request_id in (
       select id from funeral_requests where family_member_id=$2
     ))`,
    [sessionId, familyMember.id]
  )).rows[0];

  if (!session) {
    return res.status(404).json({ error: 'Session not found or access denied' });
  }

  if (session.status !== 'COMPLETED') {
    return res.status(400).json({ error: 'Can only rate services in completed sessions' });
  }

  // Verify service was in this session
  const sessionService = (await query(
    'select id from session_services where session_id=$1 and service_id=$2',
    [session.id, serviceId]
  )).rows[0];

  if (!sessionService) {
    return res.status(404).json({ error: 'Service not found in this session' });
  }

  // Prevent duplicate ratings for the same service in a session
  const existingReview = (await query(
    `select id from reviews where service_id=$1 and family_member_id=$2 and session_id=$3 limit 1`,
    [serviceId, familyMember.id, session.id]
  )).rows[0];

  if (existingReview) {
    return res.status(409).json({ error: 'Service has already been rated for this session' });
  }

  const reviewResult = await query(
    `insert into reviews (service_id, family_member_id, session_id, rating, comment, created_by)
     values ($1, $2, $3, $4, $5, $6)
     returning id, rating, comment, created_at`,
    [serviceId, familyMember.id, session.id, rating, comment || null, user.id]
  );

  // Update service rating aggregate
  await updateServiceRatingAggregate(serviceId);

  res.json({
    success: true,
    review: reviewResult.rows[0]
  });
});

/**
 * Get all reviews for a service (organizer view)
 */
export const getServiceReviews = asyncHandler(async (req: any, res: any) => {
  const { serviceId } = req.params;
  const user = req.user;

  // Verify organizer owns this service
  const service = (await query(
    'select organizer_id from services where id=$1',
    [serviceId]
  )).rows[0];

  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  if (user.role === 'ORGANIZER') {
    const organizer = (await query(
      'select id from organizers where user_id=$1',
      [user.id]
    )).rows[0];

    if (!organizer || organizer.id !== service.organizer_id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
  }

  const reviews = (await query(
    `select 
       r.id,
       r.rating,
       r.comment,
       r.created_at,
       fm.id as family_member_id,
       u.full_name as family_name,
       fs.deceased_full_name,
       fs.session_code
     from reviews r
     join family_members fm on fm.id=r.family_member_id
     join users u on u.id=fm.user_id
     left join funeral_sessions fs on fs.id=r.session_id
     where r.service_id=$1
     order by r.created_at desc`,
    [serviceId]
  )).rows;

  res.json(reviews);
});

/**
 * Get average rating for a service (for request creation display)
 */
export const getServiceAverageRating = asyncHandler(async (req: any, res: any) => {
  const { serviceId } = req.params;

  const result = (await query(
    `select 
       coalesce(round(avg(rating)::numeric, 2), 0) as average_rating,
       count(*) as total_reviews,
       max(rating) as highest_rating,
       min(rating) as lowest_rating
     from reviews
     where service_id=$1 and rating is not null`,
    [serviceId]
  )).rows[0];

  res.json(result || { average_rating: 0, total_reviews: 0, highest_rating: null, lowest_rating: null });
});

/**
 * Get all reviews for services in a completed session (family member view)
 */
export const getSessionServiceReviews = asyncHandler(async (req: any, res: any) => {
  const { sessionId } = req.params;
  const user = req.user;

  // Verify family member access to session
  const familyMember = (await query(
    'select id from family_members where user_id=$1 limit 1',
    [user.id]
  )).rows[0];

  if (!familyMember) {
    return res.status(403).json({ error: 'Family member profile not found' });
  }

  const session = (await query(
    `select id, status from funeral_sessions
     where (id::text=$1 or session_code=$1)
       and (family_member_id=$2 or request_id in (
         select id from funeral_requests where family_member_id=$2
       ))`,
    [sessionId, familyMember.id]
  )).rows[0];

  if (!session) {
    return res.status(404).json({ error: 'Session not found or access denied' });
  }

  // Get all reviews submitted by this family member for this session's services
  const reviews = (await query(
    `select 
       r.id,
       r.service_id,
       r.rating,
       r.comment,
       r.created_at,
       ss.name as service_name,
       ss.price
     from reviews r
     join session_services ss on ss.service_id=r.service_id
     where r.session_id=$1 and r.family_member_id=$2
     order by r.created_at desc`,
    [session.id, familyMember.id]
  )).rows;

  // Also get services in session that haven't been reviewed yet
  const unreviewedServices = (await query(
    `select 
       ss.id,
       ss.service_id,
       ss.name,
       ss.price
     from session_services ss
     where ss.session_id=$1
     and ss.service_id not in (
       select service_id from reviews where session_id=$1 and family_member_id=$2
     )
     order by ss.name`,
    [session.id, familyMember.id]
  )).rows;

  res.json({
    reviews,
    unreviewedServices
  });
});

/**
 * Get batch average ratings for multiple services (for request creation display)
 */
export const getServicesAverageRatings = asyncHandler(async (req: any, res: any) => {
  const { serviceIds } = req.body;

  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    return res.status(400).json({ error: 'serviceIds array is required' });
  }

  const placeholders = serviceIds.map((_, i) => `$${i + 1}`).join(',');
  const ratings = (await query(
    `select 
       service_id,
       coalesce(round(avg(rating)::numeric, 2), 0) as average_rating,
       count(*) as total_reviews
     from reviews
     where service_id = ANY($1) and rating is not null
     group by service_id`,
    [serviceIds]
  )).rows;

  // Map results
  const ratingMap: any = {};
  ratings.forEach((r: any) => {
    ratingMap[r.service_id] = {
      average_rating: parseFloat(r.average_rating),
      total_reviews: parseInt(r.total_reviews)
    };
  });

  // Fill in missing services with 0 rating
  const result: any = {};
  serviceIds.forEach((id: string) => {
    result[id] = ratingMap[id] || { average_rating: 0, total_reviews: 0 };
  });

  res.json(result);
});

/**
 * Internal function to update service rating aggregates
 */
async function updateServiceRatingAggregate(serviceId: string) {
  await query(
    `update services
     set rating = (
       select coalesce(round(avg(rating)::numeric, 2), 0)
       from reviews
       where service_id=$1 and rating is not null
     ),
     review_count = (
       select count(*)
       from reviews
       where service_id=$1 and rating is not null
     )
     where id=$1`,
    [serviceId]
  );
}
