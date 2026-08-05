import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  submitServiceRating,
  getServiceReviews,
  getServiceAverageRating,
  getSessionServiceReviews,
  getServicesAverageRatings
} from '../controllers/ratingsController.js';

const r = Router();

// Protected routes - require authentication
r.use(authenticate);

// Submit a rating/review for a service in a completed session
r.post('/sessions/:sessionId/services/:serviceId/rate', submitServiceRating);

// Get all reviews for a service (organizer view)
r.get('/services/:serviceId/reviews', getServiceReviews);

// Get average rating for a service
r.get('/services/:serviceId/rating', getServiceAverageRating);

// Get all reviews for services in a session (family member view)
r.get('/sessions/:sessionId/reviews', getSessionServiceReviews);

// Get batch average ratings for multiple services
r.post('/services/ratings/batch', getServicesAverageRatings);

export default r;
