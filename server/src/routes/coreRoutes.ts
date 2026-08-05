import { Router } from 'express';
import { authenticate, requireActive, requireRoles } from '../middleware/auth.js';
import { query } from '../config/db.js';
import * as c from '../controllers/coreController.js';
import { updateOrganizerProfile } from '../controllers/organizerController.js';

const r = Router();

r.param('id', async (req:any, res:any, next:any, id:string) => {
	if (!id) return next();
	const currentRoute = req.route?.path || '';
	if (!currentRoute.includes('/sessions/')) return next();
	if (/^[0-9a-fA-F-]{36}$/.test(id)) return next();
	try {
		const { rows } = await query('select id from funeral_sessions where session_code=$1 limit 1', [id]);
		if (rows[0]) {
			req.params.id = rows[0].id;
		}
	} catch (error) {
		return next(error);
	}
	next();
});

r.get('/public/sessions/:id', c.getPublicSession);
r.get('/public/sessions/:id/donations', c.listPublicSessionDonations);
r.get('/public/donations/:id', c.getPublicDonation);
r.post('/public/sessions/:id/donations', c.createPublicSessionDonation);
r.patch('/public/donations/:id', c.updatePublicDonation);
// Public collectors can request per-donation edit approval
r.post('/public/donations/:id/request-edit', c.createPublicDonationEditRequest);
// Public collectors can check the status of their per-donation edit request
r.get('/public/donations/:id/requests', c.getPublicDonationRequests);

r.use(authenticate);
r.use(requireActive);

r.get('/organizer/profile', requireRoles('ORGANIZER'), c.organizerProfile);
r.patch('/organizer/profile', requireRoles('ORGANIZER'), updateOrganizerProfile);

r.get('/services', c.listServices);
r.post('/services', requireRoles('ORGANIZER','SUPER_ADMIN'), c.createService);
r.patch('/services/:id', requireRoles('ORGANIZER','SUPER_ADMIN'), c.updateService);
r.delete('/services/:id', requireRoles('ORGANIZER','SUPER_ADMIN'), c.deleteService);

r.get('/requests', c.listRequests);
r.post('/requests', requireRoles('FAMILY_MEMBER','ORGANIZER','SUPER_ADMIN'), c.createRequest);
r.post('/requests/:id/accept', requireRoles('ORGANIZER','SUPER_ADMIN'), c.acceptRequest);
r.post('/requests/:id/decline', requireRoles('ORGANIZER','SUPER_ADMIN'), c.declineRequest);
r.delete('/requests/:id', requireRoles('FAMILY_MEMBER','ORGANIZER','SUPER_ADMIN'), c.deleteRequest);
r.post('/requests/:id/request-walkin-payment', requireRoles('ORGANIZER','SUPER_ADMIN'), c.requestWalkInPayment);
r.post('/requests/:id/confirm-walkin-payment', requireRoles('ORGANIZER','SUPER_ADMIN'), c.confirmWalkInPayment);

r.post('/sessions', requireRoles('ORGANIZER','SUPER_ADMIN'), c.createSession);
r.get('/sessions', c.sessions);
r.post('/donations', c.addDonation);
r.post('/sessions/:id/donations', requireRoles('ORGANIZER','SUPER_ADMIN','FAMILY_MEMBER'), c.createSessionDonation);
r.get('/sessions/:id/donations', requireRoles('ORGANIZER','SUPER_ADMIN','FAMILY_MEMBER'), c.listDonations);
r.get('/donations/:id', requireRoles('ORGANIZER','SUPER_ADMIN'), c.getDonation);
r.patch('/donations/:id', requireRoles('ORGANIZER','SUPER_ADMIN'), c.updateDonation);
// Family members may request per-donation edit approval (authenticated)
r.post('/donations/:id/requests', requireRoles('FAMILY_MEMBER'), c.createDonationEditRequest);

// Organizer views and manages per-donation edit requests
r.get('/sessions/:id/donation-requests', requireRoles('ORGANIZER','SUPER_ADMIN'), c.listDonationEditRequests);
r.patch('/donations/:donationId/requests/:requestId/approve', requireRoles('ORGANIZER','SUPER_ADMIN'), c.approveDonationEditRequest);
r.patch('/donations/:donationId/requests/:requestId/reject', requireRoles('ORGANIZER','SUPER_ADMIN'), c.rejectDonationEditRequest);
r.post('/sessions/:id/summary', c.summary);
r.post('/sessions/:id/complete', requireRoles('ORGANIZER','SUPER_ADMIN'), c.completeSession);

// Family-friendly overview (no monetary values)
r.get('/sessions/:id/overview', requireRoles('ORGANIZER','SUPER_ADMIN','FAMILY_MEMBER'), c.familyOverview);

// collector management
r.get('/sessions/:id/collectors', requireRoles('ORGANIZER','SUPER_ADMIN'), c.listSessionCollectors);
r.patch('/sessions/:id/collectors/:collectorIdentifier/approve', requireRoles('ORGANIZER','SUPER_ADMIN'), c.approveSessionCollector);
r.patch('/sessions/:id/collectors/:collectorIdentifier/reject', requireRoles('ORGANIZER','SUPER_ADMIN'), c.rejectSessionCollector);

// session management endpoints
r.get('/sessions/:id', requireRoles('ORGANIZER','SUPER_ADMIN','FAMILY_MEMBER'), c.getSession);
r.patch('/sessions/:id', requireRoles('ORGANIZER','SUPER_ADMIN'), c.updateSession);
r.patch('/sessions/:id/archive', requireRoles('ORGANIZER','SUPER_ADMIN'), c.archiveSession);
r.delete('/sessions/:id', requireRoles('ORGANIZER','SUPER_ADMIN'), c.deleteSession);
r.get('/audit', requireRoles('SUPER_ADMIN'), c.listAuditLogs);
r.get('/sessions/:id/one-week', requireRoles('ORGANIZER','SUPER_ADMIN'), c.getOneWeek);
r.patch('/sessions/:id/one-week', requireRoles('ORGANIZER','SUPER_ADMIN'), c.updateOneWeek);
// planning and preparations (session_meta)
r.get('/sessions/:id/planning', requireRoles('ORGANIZER','SUPER_ADMIN','FAMILY_MEMBER'), c.getPlanning);
r.patch('/sessions/:id/planning', requireRoles('ORGANIZER','SUPER_ADMIN'), c.updatePlanning);

r.get('/sessions/:id/preparations', requireRoles('ORGANIZER','SUPER_ADMIN','FAMILY_MEMBER'), c.getPreparations);
r.patch('/sessions/:id/preparations', requireRoles('ORGANIZER','SUPER_ADMIN'), c.updatePreparations);

// checklists
r.get('/sessions/:id/checklists', requireRoles('ORGANIZER','SUPER_ADMIN','FAMILY_MEMBER'), c.listChecklists);
r.post('/sessions/:id/checklists', requireRoles('ORGANIZER','SUPER_ADMIN'), c.createChecklist);
r.patch('/checklists/:id', requireRoles('ORGANIZER','SUPER_ADMIN'), c.updateChecklist);
r.delete('/checklists/:id', requireRoles('ORGANIZER','SUPER_ADMIN'), c.deleteChecklist);

// timelines
r.get('/sessions/:id/timelines', requireRoles('ORGANIZER','SUPER_ADMIN','FAMILY_MEMBER'), c.listTimelines);
r.post('/sessions/:id/timelines', requireRoles('ORGANIZER','SUPER_ADMIN'), c.createTimeline);
r.patch('/timelines/:id', requireRoles('ORGANIZER','SUPER_ADMIN'), c.updateTimeline);
r.delete('/timelines/:id', requireRoles('ORGANIZER','SUPER_ADMIN'), c.deleteTimeline);

// volunteers
r.get('/sessions/:id/volunteers', requireRoles('ORGANIZER','SUPER_ADMIN','FAMILY_MEMBER'), c.listVolunteers);
r.post('/sessions/:id/volunteers', requireRoles('ORGANIZER','SUPER_ADMIN'), c.createVolunteer);
r.patch('/volunteers/:id', requireRoles('ORGANIZER','SUPER_ADMIN'), c.updateVolunteer);
r.delete('/volunteers/:id', requireRoles('ORGANIZER','SUPER_ADMIN'), c.deleteVolunteer);

// expenses
r.get('/sessions/:id/expenses', requireRoles('ORGANIZER','SUPER_ADMIN'), c.listExpenses);
r.post('/sessions/:id/expenses', requireRoles('ORGANIZER','SUPER_ADMIN'), c.createExpense);
r.patch('/expenses/:id', requireRoles('ORGANIZER','SUPER_ADMIN'), c.updateExpense);
r.delete('/expenses/:id', requireRoles('ORGANIZER','SUPER_ADMIN'), c.deleteExpense);

// notes
r.get('/sessions/:id/notes', requireRoles('ORGANIZER','SUPER_ADMIN','FAMILY_MEMBER'), c.listNotes);
r.post('/sessions/:id/notes', requireRoles('ORGANIZER','SUPER_ADMIN','FAMILY_MEMBER'), c.createNote);
r.delete('/notes/:id', requireRoles('ORGANIZER','SUPER_ADMIN'), c.deleteNote);

// session services management
r.get('/sessions/:id/services', requireRoles('ORGANIZER','SUPER_ADMIN','FAMILY_MEMBER'), c.listSessionServices);
r.post('/sessions/:id/services', requireRoles('ORGANIZER','SUPER_ADMIN'), c.addSessionService);
r.delete('/sessions/services/:id', requireRoles('ORGANIZER','SUPER_ADMIN'), c.removeSessionService);

export default r;
