import { asyncHandler } from '../utils/errors.js';
import { query } from '../config/db.js';
import { resolveRequestSubmissionContext } from '../services/requestSubmission.js';
import { generateSessionSummary, generateFamilyOverview, completeSessionAndNotify } from '../services/summaryService.js';
import { initializePaystack } from '../services/paymentService.js';
import { sendWalkInPaymentRequest } from '../services/requestPaymentService.js';

async function getSessionForAccess(identifier:string) {
  const { rows } = await query(
    `
    select
      fs.id,
      fs.organizer_id,
      fs.family_member_id,
      fs.status,
      fr.family_member_id as request_family_member_id
    from funeral_sessions fs
    left join funeral_requests fr on fr.id = fs.request_id
    where fs.id::text = $1 or fs.session_code = $1
    limit 1
    `,
    [identifier]
  );
  return rows[0];
}

export async function resolveSessionId(identifier:string) {
  if (!identifier || !String(identifier).trim()) return null;
  const { rows } = await query('select id from funeral_sessions where id::text=$1 or session_code=$1 limit 1', [String(identifier).trim()]);
  return rows[0]?.id || null;
}

async function assertOrganizerAccess(req:any, sessionIdentifier:string){
  const user = req.user;
  if(user?.role === 'SUPER_ADMIN') {
    const session = await getSessionForAccess(sessionIdentifier);
    if(!session) throw { status:404, message:'Session not found' };
    return session.id;
  }
  if(user?.role !== 'ORGANIZER') throw { status:403, message:'Only organizer allowed' };
  const organizer = (await query('select id from organizers where user_id=$1',[user.id])).rows[0];
  if(!organizer) throw { status:403, message:'Organizer profile not found' };
  const session = await getSessionForAccess(sessionIdentifier);
  if(!session) throw { status:404, message:'Session not found' };
  if(session.status === 'COMPLETED') throw { status:403, message:'Session completed; no modifications allowed' };
  if(session.organizer_id !== organizer.id) throw { status:403, message:'Not authorized for this session' };
  return session.id;
}

async function assertOrganizerAccessAllowCompleted(req:any, sessionIdentifier:string){
  const user = req.user;
  if(user?.role === 'SUPER_ADMIN') {
    const session = await getSessionForAccess(sessionIdentifier);
    if(!session) throw { status:404, message:'Session not found' };
    return session.id;
  }
  if(user?.role !== 'ORGANIZER') throw { status:403, message:'Only organizer allowed' };
  const organizer = (await query('select id from organizers where user_id=$1',[user.id])).rows[0];
  if(!organizer) throw { status:403, message:'Organizer profile not found' };
  const session = await getSessionForAccess(sessionIdentifier);
  if(!session) throw { status:404, message:'Session not found' };
  if(session.organizer_id !== organizer.id) throw { status:403, message:'Not authorized for this session' };
  return session.id;
}

async function assertSessionAccess(req:any, sessionIdentifier:string){
  const user = req.user;
  const session = await getSessionForAccess(sessionIdentifier);
  if(!session) throw { status:404, message:'Session not found' };
  if(user?.role === 'SUPER_ADMIN') return session.id;

  if(user?.role === 'ORGANIZER'){
    const organizer = (await query('select id from organizers where user_id=$1',[user.id])).rows[0];
    if(!organizer) throw { status:403, message:'Organizer profile not found' };
    if(session.organizer_id !== organizer.id) throw { status:403, message:'Not authorized for this session' };
    return session.id;
  }

  if(user?.role === 'FAMILY_MEMBER'){
    const familyMember = (await query('select id from family_members where user_id=$1 limit 1',[user.id])).rows[0];
    if(!familyMember) throw { status:403, message:'Family member profile not found' };
    if(session.family_member_id !== familyMember.id && session.request_family_member_id !== familyMember.id) {
      throw { status:403, message:'Not authorized for this session' };
    }
    return session.id;
  }

  throw { status:403, message:'Not authorized' };
}

async function assertDonationAccess(req:any, donationId:string) {
  const donation = (await query('select session_id from donations where id=$1', [donationId])).rows[0];
  if(!donation) throw { status:404, message:'Donation not found' };
  return assertSessionAccess(req, String(donation.session_id));
}

async function getPublicSessionForAccess(sessionIdentifier:string, organizerIdentifier: any) {
  const orgId = Array.isArray(organizerIdentifier) ? (organizerIdentifier[0] || '') : (organizerIdentifier || '');
  const normalizedId = String(orgId).trim().toUpperCase();
  const { rows } = await query(
    `
    select fs.*, ou.full_name as organizer_name, fu.full_name as family_member_name
    from funeral_sessions fs
    join organizers o on o.id = fs.organizer_id
    join users ou on ou.id = o.user_id
    left join family_members fm on fm.id = fs.family_member_id
    left join users fu on fu.id = fm.user_id
    where (fs.id::text = $1 or fs.session_code = $1)
      and upper(o.organizer_identifier) = $2
    limit 1
    `,
    [sessionIdentifier, normalizedId]
  );
  return rows[0];
}

async function validateCollectorAccess(sessionId: string, collectorIdentifier: string, collectorName: string) {
  // Get collector limit from session_meta
  const { rows: sessionRows } = await query(
    `select session_meta->'collector_count' as collector_limit from funeral_sessions where id=$1`,
    [sessionId]
  );
  const collectorLimit = sessionRows[0]?.collector_limit ? Number(sessionRows[0].collector_limit) : null;
  
  // If no limit is set, deny access
  if (!collectorLimit) {
    throw new Error('Collector limit not set by organizer. Please contact the organizer.');
  }

  // Check or create collector entry
  const { rows: existingCollector } = await query(
    `select * from session_collectors where session_id=$1 and collector_identifier=$2 limit 1`,
    [sessionId, collectorIdentifier]
  );

  if (existingCollector.length > 0) {
    const collector = existingCollector[0];
    // Check if approved
    if (!collector.approved) {
      throw { message: 'Awaiting organizer approval', code: 'APPROVAL_PENDING', approved: false };
    }
    return { approved: true, collector };
  }

  // New collector - check if limit is reached
  const { rows: collectorCountRows } = await query(
    `select count(distinct collector_identifier) as approved_count from session_collectors where session_id=$1 and approved=true`,
    [sessionId]
  );
  const approvedCount = Number(collectorCountRows[0]?.approved_count || 0);

  if (approvedCount >= collectorLimit) {
    throw new Error('Collector limit reached. No more access can be granted at this time.');
  }

  // Insert new collector with approval pending
  await query(
    `insert into session_collectors(session_id, collector_identifier, collector_name, approved) values($1,$2,$3,false)`,
    [sessionId, collectorIdentifier, collectorName]
  );

  throw { message: 'Awaiting organizer approval', code: 'APPROVAL_PENDING', approved: false };
}

export const getPublicSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizerIdentifierRaw = Array.isArray(req.query.organizerIdentifier) ? req.query.organizerIdentifier[0] : (req.query.organizerIdentifier || '');
  const organizerIdentifier = String(organizerIdentifierRaw).trim().toUpperCase();
  const collectorName = String(req.query.collectorName || '').trim();
  if (!organizerIdentifier) return res.status(422).json({ message: 'Organizer identifier required' });

  const session = await getPublicSessionForAccess(String(id), organizerIdentifier as string);
  if (!session) return res.status(404).json({ message: 'Session not found' });

  // Disallow public collector access for completed sessions
  if (session.status === 'COMPLETED') return res.status(403).json({ message: 'Session completed; public collector access disabled' });

  // Validate collector access if collectorName is provided
  if (collectorName) {
    try {
      await validateCollectorAccess(session.id, organizerIdentifier, collectorName);
    } catch (error: any) {
      if (error.code === 'APPROVAL_PENDING') {
        return res.status(403).json({ message: error.message, code: error.code, approved: error.approved });
      }
      return res.status(403).json({ message: error.message || error });
    }
  }

  return res.json(session);
});

export const listPublicSessionDonations = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizerIdentifierRaw = Array.isArray(req.query.organizerIdentifier) ? req.query.organizerIdentifier[0] : (req.query.organizerIdentifier || '');
  const organizerIdentifier = String(organizerIdentifierRaw).trim().toUpperCase();
  const collectorName = String(req.query.collectorName || '').trim();
  if (!organizerIdentifier) return res.status(422).json({ message: 'Organizer identifier required' });

  const session = await getPublicSessionForAccess(String(id), organizerIdentifier as string);
  if (!session) return res.status(404).json({ message: 'Session not found' });

  // Disallow public collector access for completed sessions
  if (session.status === 'COMPLETED') return res.status(403).json({ message: 'Session completed; public collector access disabled' });

  // Validate collector access
  if (collectorName) {
    try {
      await validateCollectorAccess(session.id, organizerIdentifier, collectorName);
    } catch (error: any) {
      if (error.code === 'APPROVAL_PENDING') {
        return res.status(403).json({ message: error.message, code: error.code, approved: error.approved });
      }
      return res.status(403).json({ message: error.message || error });
    }
  }

  const { rows } = await query('select * from donations where session_id=$1 order by created_at desc', [session.id]);
  res.json(rows);
});

export const createPublicSessionDonation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizerIdentifierRaw = Array.isArray(req.query.organizerIdentifier) ? req.query.organizerIdentifier[0] : (req.query.organizerIdentifier || '');
  const organizerIdentifier = String(organizerIdentifierRaw).trim().toUpperCase();
  if (!organizerIdentifier) return res.status(422).json({ message: 'Organizer identifier required' });

  const session = await getPublicSessionForAccess(String(id), organizerIdentifier as string);
  if (!session) return res.status(404).json({ message: 'Session not found' });

  const { donorName, amount, paid, collectorName, collectorIdentifier, donorPhone, checkedInAt, notes, relativeName, relativeRelationship } = req.body;
  if (!donorName || !String(donorName).trim()) return res.status(422).json({ message: 'Donor name required' });
  if (amount === undefined || amount === null || Number(amount) < 0) return res.status(422).json({ message: 'Valid amount required' });
  if (!collectorName || !String(collectorName).trim()) return res.status(422).json({ message: 'Collector name required' });
  if (!collectorIdentifier || !String(collectorIdentifier).trim()) return res.status(422).json({ message: 'Organizer identifier required' });

  // Validate collector access
  try {
    await validateCollectorAccess(session.id, collectorIdentifier, collectorName);
  } catch (error: any) {
    if (error.code === 'APPROVAL_PENDING') {
      return res.status(403).json({ message: error.message, code: error.code, approved: error.approved });
    }
    return res.status(403).json({ message: error.message || error });
  }

  const { rows } = await query(
    'insert into donations(session_id,type,donor_name,amount,paid,collector_name,collector_identifier,donor_phone,checked_in_at,notes,relative_name,relative_relationship) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *',
    [
      session.id,
      'CASH',
      String(donorName).trim(),
      Number(amount),
      Boolean(paid),
      String(collectorName).trim(),
      String(collectorIdentifier).trim(),
      donorPhone ? String(donorPhone).trim() : null,
      checkedInAt ? String(checkedInAt).trim() : null,
      notes ? String(notes).trim() : null,
      relativeName ? String(relativeName).trim() : null,
      relativeRelationship ? String(relativeRelationship).trim() : null,
    ]
  );
  res.status(201).json(rows[0]);
});

export const updatePublicDonation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizerIdentifier = String(req.query.organizerIdentifier || '').trim().toUpperCase();
  const collectorName = String(req.query.collectorName || '').trim();
  if (!organizerIdentifier) return res.status(422).json({ message: 'Organizer identifier required' });
  if (!collectorName) return res.status(422).json({ message: 'Collector name required' });

  // Get the donation to find its session
  const { rows: donationRows } = await query(
    `select * from donations where id=$1 limit 1`,
    [id]
  );
  if (!donationRows[0]) return res.status(404).json({ message: 'Donation not found' });

  const donation = donationRows[0];
  
  // Validate session access
  const { rows: sessionRows } = await query(
    `
    select fs.* from funeral_sessions fs
    join organizers o on o.id = fs.organizer_id
    where fs.id=$1 and upper(o.organizer_identifier)=$2 limit 1
    `,
    [donation.session_id, organizerIdentifier]
  );
  if (!sessionRows[0]) return res.status(404).json({ message: 'Session not found' });

  // Validate collector approval (allow per-donation approved edit requests)
  let consumedRequestId: string | null = null;
  try {
    await validateCollectorAccess(donation.session_id, organizerIdentifier, collectorName);
  } catch (error: any) {
    if (error.code === 'APPROVAL_PENDING') {
      // allow editing if organizer explicitly approved an edit request for this donation
      const { rows: editReqRows } = await query(
        'select * from donation_edit_requests where donation_id=$1 and requester_collector_identifier=$2 and requester_collector_name=$3 and status=$4 limit 1',
        [donation.id, organizerIdentifier, collectorName, 'APPROVED']
      );
      if (!editReqRows[0]) {
        return res.status(403).json({ message: error.message, code: error.code, approved: error.approved });
      }
      consumedRequestId = editReqRows[0].id;
      // otherwise proceed
    } else {
      return res.status(403).json({ message: error.message || error });
    }
  }

  // Verify collector owns this donation
  if (donation.collector_name !== collectorName || donation.collector_identifier !== organizerIdentifier) {
    return res.status(403).json({ message: 'You can only edit your own donations' });
  }

  const { donorName, amount, paid, donorPhone, checkedInAt, notes, relativeName, relativeRelationship, approved, approvalNotes } = req.body;
  if (donorName !== undefined && !String(donorName).trim()) return res.status(422).json({ message: 'Donor name cannot be empty' });
  if (amount !== undefined && (amount === null || Number(amount) < 0)) return res.status(422).json({ message: 'Valid amount required' });

  const updateFields: string[] = [];
  const updateValues: any[] = [];
  let paramIndex = 1;

  if (donorName !== undefined) {
    updateFields.push(`donor_name=$${paramIndex}`);
    updateValues.push(String(donorName).trim());
    paramIndex++;
  }
  if (amount !== undefined) {
    updateFields.push(`amount=$${paramIndex}`);
    updateValues.push(Number(amount));
    paramIndex++;
  }
  if (paid !== undefined) {
    updateFields.push(`paid=$${paramIndex}`);
    updateValues.push(Boolean(paid));
    paramIndex++;
  }
  if (donorPhone !== undefined) {
    updateFields.push(`donor_phone=$${paramIndex}`);
    updateValues.push(donorPhone ? String(donorPhone).trim() : null);
    paramIndex++;
  }
  if (checkedInAt !== undefined) {
    updateFields.push(`checked_in_at=$${paramIndex}`);
    updateValues.push(checkedInAt ? String(checkedInAt).trim() : null);
    paramIndex++;
  }
  if (notes !== undefined) {
    updateFields.push(`notes=$${paramIndex}`);
    updateValues.push(notes ? String(notes).trim() : null);
    paramIndex++;
  }
  if (relativeName !== undefined) {
    updateFields.push(`relative_name=$${paramIndex}`);
    updateValues.push(relativeName ? String(relativeName).trim() : null);
    paramIndex++;
  }
  if (relativeRelationship !== undefined) {
    updateFields.push(`relative_relationship=$${paramIndex}`);
    updateValues.push(relativeRelationship ? String(relativeRelationship).trim() : null);
    paramIndex++;
  }

  if (updateFields.length === 0) return res.status(422).json({ message: 'No fields to update' });

  updateValues.push(id);
  const { rows } = await query(
    `update donations set ${updateFields.join(',')} where id=$${paramIndex} returning *`,
    updateValues
  );

  // If amount was changed and a per-donation approved request was used, mark it consumed
  try {
    if (amount !== undefined && consumedRequestId) {
      await query('update donation_edit_requests set status=$1 where id=$2 and donation_id=$3', ['CONSUMED', consumedRequestId, donation.id]);
      try { await query('update donation_edit_requests set consumed_at=now() where id=$1', [consumedRequestId]); } catch (e) { /* ignore */ }
    }
  } catch (e) {
    // non-fatal
  }

  res.json(rows[0]);
});

export const getPublicDonation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizerIdentifier = String(req.query.organizerIdentifier || '').trim().toUpperCase();
  const collectorName = String(req.query.collectorName || '').trim();
  if (!organizerIdentifier) return res.status(422).json({ message: 'Organizer identifier required' });
  if (!collectorName) return res.status(422).json({ message: 'Collector name required' });

  const { rows: donationRows } = await query(
    `select d.*, fs.session_code from donations d join funeral_sessions fs on fs.id = d.session_id where d.id = $1 limit 1`,
    [id]
  );
  if (!donationRows[0]) return res.status(404).json({ message: 'Donation not found' });
  const donation = donationRows[0];

  const { rows: sessionRows } = await query(
    `
    select fs.* from funeral_sessions fs
    join organizers o on o.id = fs.organizer_id
    where fs.id=$1 and upper(o.organizer_identifier)=$2 limit 1
    `,
    [donation.session_id, organizerIdentifier]
  );
  if (!sessionRows[0]) return res.status(404).json({ message: 'Session not found' });

  if (donation.collector_name !== collectorName || donation.collector_identifier?.toUpperCase() !== organizerIdentifier) {
    return res.status(403).json({ message: 'You can only access your own donation' });
  }

  res.json(donation);
});

export const getPublicDonationRequests = asyncHandler(async (req, res) => {
  const { id } = req.params; // donation id
  const organizerIdentifier = String(req.query.organizerIdentifier || '').trim().toUpperCase();
  const collectorName = String(req.query.collectorName || '').trim();
  if (!organizerIdentifier) return res.status(422).json({ message: 'Organizer identifier required' });
  if (!collectorName) return res.status(422).json({ message: 'Collector name required' });

  const { rows: donationRows } = await query('select * from donations where id=$1 limit 1', [id]);
  if (!donationRows[0]) return res.status(404).json({ message: 'Donation not found' });
  const donation = donationRows[0];

  // verify collector recorded this donation
  if (donation.collector_name !== collectorName || String(donation.collector_identifier || '').toUpperCase() !== organizerIdentifier) {
    return res.status(403).json({ message: 'You can only view requests for donations you recorded' });
  }

  const { rows } = await query('select * from donation_edit_requests where donation_id=$1 and requester_collector_identifier=$2 and requester_collector_name=$3 order by created_at desc', [id, organizerIdentifier, collectorName]);
  res.json(rows);
});

export const listSessionCollectors = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rows } = await query(
    `select * from session_collectors where session_id=$1 order by approved desc, created_at asc`,
    [id]
  );
  res.json(rows);
});

export const approveSessionCollector = asyncHandler(async (req, res) => {
  const { id, collectorIdentifier } = req.params;
  const userId = req.user?.id;
  
  const { rows } = await query(
    `update session_collectors set approved=true, approved_by=$1, approved_at=now() where session_id=$2 and collector_identifier=$3 returning *`,
    [userId, id, collectorIdentifier]
  );
  
  if (!rows[0]) {
    return res.status(404).json({ message: 'Collector not found' });
  }
  
  res.json(rows[0]);
});

export const rejectSessionCollector = asyncHandler(async (req, res) => {
  const { id, collectorIdentifier } = req.params;
  const { reason } = req.body;
  
  const { rows } = await query(
    `update session_collectors set approved=false, rejected_at=now(), rejection_reason=$1 where session_id=$2 and collector_identifier=$3 returning *`,
    [reason || 'Rejected by organizer', id, collectorIdentifier]
  );
  
  if (!rows[0]) {
    return res.status(404).json({ message: 'Collector not found' });
  }
  
  res.json(rows[0]);
});

// Donation edit requests
export const createDonationEditRequest = asyncHandler(async (req, res) => {
  const { id } = req.params; // donation id
  const reason = req.body.reason ? String(req.body.reason).trim() : null;
  const { rows: donationRows } = await query('select * from donations where id=$1 limit 1', [id]);
  if (!donationRows[0]) return res.status(404).json({ message: 'Donation not found' });
  const donation = donationRows[0];

  if (req.user?.role === 'FAMILY_MEMBER') {
    const familyMember = (await query('select id from family_members where user_id=$1 limit 1', [req.user.id])).rows[0];
    if (!familyMember) return res.status(403).json({ message: 'Family member profile not found' });
    if (!donation.family_member_id || String(donation.family_member_id) !== String(familyMember.id)) {
      return res.status(403).json({ message: 'You can only request edits for donations you recorded' });
    }
    const { rows } = await query('insert into donation_edit_requests(donation_id, requester_user_id, reason) values($1,$2,$3) returning *', [id, req.user.id, reason]);
    return res.status(201).json(rows[0]);
  }

  return res.status(403).json({ message: 'Only family members may create authenticated edit requests' });
});

export const createPublicDonationEditRequest = asyncHandler(async (req, res) => {
  const { id } = req.params; // donation id
  const organizerIdentifier = String(req.query.organizerIdentifier || '').trim().toUpperCase();
  const collectorName = String(req.query.collectorName || '').trim();
  const reason = req.body.reason ? String(req.body.reason).trim() : null;
  if (!organizerIdentifier) return res.status(422).json({ message: 'Organizer identifier required' });
  if (!collectorName) return res.status(422).json({ message: 'Collector name required' });

  const { rows: donationRows } = await query('select * from donations where id=$1 limit 1', [id]);
  if (!donationRows[0]) return res.status(404).json({ message: 'Donation not found' });
  const donation = donationRows[0];

  // verify collector recorded this donation
  if (donation.collector_name !== collectorName || String(donation.collector_identifier || '').toUpperCase() !== organizerIdentifier) {
    return res.status(403).json({ message: 'You can only request edits for donations you recorded' });
  }

  const { rows } = await query('insert into donation_edit_requests(donation_id, requester_collector_identifier, requester_collector_name, reason) values($1,$2,$3,$4) returning *', [id, organizerIdentifier, collectorName, reason]);
  return res.status(201).json(rows[0]);
});

export const listDonationEditRequests = asyncHandler(async (req, res) => {
  const { id } = req.params; // session id
  const { rows } = await query(
    `select der.*, d.donor_name, d.amount, d.collector_name, d.collector_identifier, d.session_id from donation_edit_requests der join donations d on d.id = der.donation_id where d.session_id=$1 order by der.created_at desc`,
    [id]
  );
  res.json(rows);
});

export const approveDonationEditRequest = asyncHandler(async (req, res) => {
  const { donationId, requestId } = req.params;
  const userId = req.user?.id;
  const { rows } = await query('update donation_edit_requests set status=$1, approved_by=$2, approved_at=now() where id=$3 and donation_id=$4 returning *', ['APPROVED', userId || null, requestId, donationId]);
  if (!rows[0]) return res.status(404).json({ message: 'Request not found' });
  res.json(rows[0]);
});

export const rejectDonationEditRequest = asyncHandler(async (req, res) => {
  const { donationId, requestId } = req.params;
  const { reason } = req.body;
  const { rows } = await query('update donation_edit_requests set status=$1, reason=$2 where id=$3 and donation_id=$4 returning *', ['REJECTED', reason || 'Rejected by organizer', requestId, donationId]);
  if (!rows[0]) return res.status(404).json({ message: 'Request not found' });
  res.json(rows[0]);
});

async function updateSessionProgress(sessionId:string) {
  await query(
    `
    update funeral_sessions
    set progress = coalesce(
      case when stats.total_count = 0 then 0 else round((stats.completed_count::numeric / stats.total_count::numeric) * 100)::int end,
      0
    )
    from (
      select count(*) filter (where completed) as completed_count, count(*) as total_count
      from checklists
      where session_id = $1
    ) stats
    where id = $1
    `,
    [sessionId]
  );
}
export const listServices = asyncHandler(async (req, res) => {
  let organizerId = req.query.organizerId
    ? String(req.query.organizerId)
    : null;

  const organizerIdentifier = req.query.organizerIdentifier
    ? String(req.query.organizerIdentifier).trim().toUpperCase()
    : null;

  if (!organizerId && organizerIdentifier) {
    const organizer = (
      await query(
        'select id from organizers where upper(organizer_identifier)=$1',
        [organizerIdentifier]
      )
    ).rows[0];

    organizerId = organizer?.id;
  }

  if (!organizerId && req.user?.role === 'ORGANIZER') {
    const organizer = (
      await query(
        'select id from organizers where user_id=$1',
        [req.user.id]
      )
    ).rows[0];

    organizerId = organizer?.id;
  }

  if (!organizerId) {
    return res.json([]);
  }

  const { rows } = await query(
    `
    select
      s.*,
      coalesce(sc.name, 'Custom Service') as category_name
    from services s
    left join service_categories sc on sc.id = s.category_id
    where s.organizer_id=$1
      and s.deleted_at is null
    order by
      coalesce(
        array_position(
          array[
            'Caterers',
            'Coffin Makers',
            'Photographers',
            'Florists',
            'Pastors',
            'MCs',
            'Transportation',
            'Decoration',
            'Venue',
            'Sound Systems',
            'Custom Service'
          ]::text[],
          coalesce(sc.name, 'Custom Service')
        ),
        999
      )
    `,
    [organizerId]
  );

  return res.json(rows);
});

export const createService = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    categoryId,
    categoryName,
    images = [],
  } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(422).json({ message: 'Service name is required' });
  }

  if (!price || Number(price) <= 0) {
    return res.status(422).json({ message: 'Valid price is required' });
  }

  let organizerId: string | null = null;

  if (req.user?.role === 'SUPER_ADMIN') {
    const requestedOrganizerId = req.body.organizerId ? String(req.body.organizerId).trim() : null;
    const requestedOrganizerIdentifier = req.body.organizerIdentifier ? String(req.body.organizerIdentifier).trim().toUpperCase() : null;

    if (requestedOrganizerId) {
      const result = await query('select id from organizers where id=$1 limit 1', [requestedOrganizerId]);
      organizerId = result.rows[0]?.id || null;
    } else if (requestedOrganizerIdentifier) {
      const result = await query('select id from organizers where upper(organizer_identifier)=$1 limit 1', [requestedOrganizerIdentifier]);
      organizerId = result.rows[0]?.id || null;
    }

    if (!organizerId) {
      return res.status(422).json({ message: 'Organizer ID or Organizer Identifier required for SUPER_ADMIN' });
    }
  } else {
    const organizer = (
      await query(
        'select id from organizers where user_id=$1',
        [req.user!.id]
      )
    ).rows[0];

    if (!organizer) {
      return res.status(403).json({ message: 'Organizer profile not found' });
    }

    organizerId = organizer.id;
  }

  let finalCategoryId = categoryId || null;

  if (!finalCategoryId && categoryName) {
    const categoryResult = await query(
      `
      insert into service_categories (name)
      values ($1)
      on conflict (name)
      do update set name=excluded.name
      returning id
      `,
      [String(categoryName).trim()]
    );

    finalCategoryId = categoryResult.rows[0].id;
  }

  const { rows } = await query(
    `
    insert into services (
      organizer_id,
      category_id,
      name,
      description,
      price,
      images
    )
    values ($1,$2,$3,$4,$5,$6)
    returning id
    `,
    [
      organizerId,
      finalCategoryId,
      String(name).trim(),
      description ? String(description).trim() : null,
      Number(price),
      Array.isArray(images) ? images : [],
    ]
  );

  const serviceId = rows[0].id;
  const result = await query(
    `
    select
      s.*, 
      coalesce(sc.name, 'Custom Service') as category_name
    from services s
    left join service_categories sc on sc.id = s.category_id
    where s.id = $1
    `,
    [serviceId]
  );

  return res.status(201).json(result.rows[0]);
});
export const organizerProfile = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `
    select
      u.id,
      u.full_name,
      u.email,
      u.phone,
      u.status as account_status,
      o.id as organizer_id,
      o.organizer_identifier,
      o.subscription_status,
      o.payment_phone
    from users u
    join organizers o on o.user_id = u.id
    where u.id = $1
    limit 1
    `,
    [req.user!.id]
  );

  if (!rows[0]) {
    return res.status(404).json({
      message: 'Organizer profile not found',
    });
  }

  return res.json(rows[0]);
});
export const updateService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const {
    name,
    description,
    price,
    categoryId,
    categoryName,
    images = [],
  } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(422).json({ message: 'Service name is required' });
  }

  if (!price || Number(price) <= 0) {
    return res.status(422).json({ message: 'Valid price is required' });
  }

  let organizerId: string | null = null;
  if (req.user?.role !== 'SUPER_ADMIN') {
    const organizer = (
      await query(
        'select id from organizers where user_id=$1',
        [req.user!.id]
      )
    ).rows[0];

    if (!organizer) {
      return res.status(403).json({ message: 'Organizer profile not found' });
    }

    organizerId = organizer.id;
  }

  const existingService = (
    await query(
      `
      select *
      from services
      where id=$1
        ${organizerId ? 'and organizer_id=$2' : ''}
        and deleted_at is null
      `,
      organizerId ? [id, organizerId] : [id]
    )
  ).rows[0];

  if (!existingService) {
    return res.status(404).json({
      message: 'Service not found or you do not have permission to edit it',
    });
  }

  let finalCategoryId = categoryId || existingService.category_id || null;

  if (categoryName) {
    const categoryResult = await query(
      `
      insert into service_categories (name)
      values ($1)
      on conflict (name)
      do update set name=excluded.name
      returning id
      `,
      [String(categoryName).trim()]
    );

    finalCategoryId = categoryResult.rows[0].id;
  }

  const { rows } = await query(
    `
    update services
    set
      category_id=$1,
      name=$2,
      description=$3,
      price=$4,
      images=$5
    where id=$6
      ${organizerId ? 'and organizer_id=$7' : ''}
      and deleted_at is null
    returning id
    `,
    organizerId ? [
      finalCategoryId,
      String(name).trim(),
      description ? String(description).trim() : null,
      Number(price),
      Array.isArray(images) ? images : [],
      id,
      organizerId,
    ] : [
      finalCategoryId,
      String(name).trim(),
      description ? String(description).trim() : null,
      Number(price),
      Array.isArray(images) ? images : [],
      id,
    ]
  );

  const serviceId = rows[0]?.id;
  if (!serviceId) {
    return res.status(404).json({ message: 'Service not found or you do not have permission to edit it' });
  }

  const result = await query(
    `
    select
      s.*,
      coalesce(sc.name, 'Custom Service') as category_name
    from services s
    left join service_categories sc on sc.id = s.category_id
    where s.id = $1
    `,
    [serviceId]
  );

  return res.json(result.rows[0]);
});
export const deleteService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let organizerId: string | null = null;
  if (req.user?.role !== 'SUPER_ADMIN') {
    const organizer = (
      await query(
        'select id from organizers where user_id=$1',
        [req.user!.id]
      )
    ).rows[0];

    if (!organizer) {
      return res.status(403).json({ message: 'Organizer profile not found' });
    }

    organizerId = organizer.id;
  }

  const existingService = (
    await query(
      `
      select *
      from services
      where id=$1
        ${organizerId ? 'and organizer_id=$2' : ''}
        and deleted_at is null
      `,
      organizerId ? [id, organizerId] : [id]
    )
  ).rows[0];

  if (!existingService) {
    return res.status(404).json({
      message: 'Service not found or you do not have permission to delete it',
    });
  }

  await query(
    `
    update services
    set deleted_at=now()
    where id=$1
      ${organizerId ? 'and organizer_id=$2' : ''}
    `,
    organizerId ? [id, organizerId] : [id]
  );

  return res.json({ message: 'Service deleted successfully' });
});
export const createRequest = asyncHandler(async (req, res) => {
  const {
    organizerIdentifier,
    deceasedFullName,
    funeralDate,
    budget,
    guestBreakdown,
    projectedAttendance,
    servicePricingDetails,
    calculatedTotal,
    selectedServices,
    contactName,
    contactPhone,
  } = req.body;

  if (!organizerIdentifier || !String(organizerIdentifier).trim()) {
    return res.status(422).json({
      message: 'Organizer Identifier is required',
    });
  }

  if (!deceasedFullName || !String(deceasedFullName).trim()) {
    return res.status(422).json({
      message: 'Deceased full name is required',
    });
  }

  const organizer = (
    await query(
      `
      select id
      from organizers
      where organizer_identifier = $1
      limit 1
      `,
      [String(organizerIdentifier).trim().toUpperCase()]
    )
  ).rows[0];

  if (!organizer) {
    return res.status(404).json({
      message: 'Organizer not found. Please check the Organizer Identifier.',
    });
  }

  const familyMember = (
    await query(
      `
      select id
      from family_members
      where user_id = $1
      limit 1
      `,
      [req.user!.id]
    )
  ).rows[0];

  let requestContext;
  try {
    requestContext = resolveRequestSubmissionContext({
      user: req.user,
      familyMemberRow: familyMember,
      contactName,
      contactPhone,
    });
  } catch (error: any) {
    return res.status(422).json({ message: error.message });
  }

  if (!requestContext.familyMemberId && !requestContext.submittedInPerson) {
    return res.status(403).json({
      message: 'Family member profile not found',
    });
  }

  const safeSelectedServices = Array.isArray(selectedServices)
    ? selectedServices
    : [];

  const selectedServicesJson = JSON.stringify(safeSelectedServices);

  const { rows } = await query(
    `
    insert into funeral_requests (
      family_member_id,
      organizer_id,
      deceased_full_name,
      funeral_date,
      budget,
      guest_breakdown,
      projected_attendance,
      service_pricing_details,
      calculated_total,
      security_count,
      usher_count,
      logistics_chairs,
      logistics_tables,
      logistics_souvenirs,
      selected_services,
      status,
      submitted_in_person,
      contact_name,
      contact_phone
    )
    values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18,$19)
    returning *
    `,
    [
      requestContext.familyMemberId,
      organizer.id,
      String(deceasedFullName).trim(),
      funeralDate ? String(funeralDate).trim() : null,
      budget ? Number(budget) : 0,
      JSON.stringify(guestBreakdown || {}),
      projectedAttendance ? Number(projectedAttendance) : null,
      JSON.stringify(servicePricingDetails || {}),
      calculatedTotal ? Number(calculatedTotal) : 0,
      // convenience integer columns pulled from servicePricingDetails if available
      servicePricingDetails ? Number(servicePricingDetails.securityCount || servicePricingDetails.security_count || 0) : 0,
      servicePricingDetails ? Number(servicePricingDetails.usherCount || servicePricingDetails.usher_count || 0) : 0,
      servicePricingDetails ? Number(servicePricingDetails.logisticsChairs || servicePricingDetails.logistics_chairs || 0) : 0,
      servicePricingDetails ? Number(servicePricingDetails.logisticsTables || servicePricingDetails.logistics_tables || 0) : 0,
      servicePricingDetails ? Number(servicePricingDetails.logisticsSouvenirs || servicePricingDetails.logistics_souvenirs || 0) : 0,
      selectedServicesJson,
      'PENDING',
      requestContext.submittedInPerson,
      requestContext.contactName,
      requestContext.contactPhone,
    ]
  );

  return res.status(201).json(rows[0]);
});
export const acceptRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let existingRequest;
  if (req.user?.role === 'SUPER_ADMIN') {
    existingRequest = (
      await query(
        `
        select *
        from funeral_requests
        where id=$1
        limit 1
        `,
        [id]
      )
    ).rows[0];
  } else {
    const organizer = (
      await query(
        `
        select id
        from organizers
        where user_id=$1
        limit 1
        `,
        [req.user!.id]
      )
    ).rows[0];

    if (!organizer) {
      return res.status(403).json({
        message: 'Organizer profile not found',
      });
    }

    existingRequest = (
      await query(
        `
        select *
        from funeral_requests
        where id=$1
          and organizer_id=$2
        limit 1
        `,
        [id, organizer.id]
      )
    ).rows[0];
  }

  if (!existingRequest) {
    return res.status(404).json({
      message: 'Request not found or you do not have permission to accept it',
    });
  }

  if (existingRequest.status !== 'PENDING') {
    return res.status(400).json({
      message: `Only pending requests can be accepted. Current status is ${existingRequest.status}`,
    });
  }

  const queryParams = [id];
  let queryText = `
    update funeral_requests
    set status='INVOICED',
        accepted_at=now()
    where id=$1
  `;

  if (req.user?.role !== 'SUPER_ADMIN') {
    queryText += ' and organizer_id=$2';
    queryParams.push(existingRequest.organizer_id);
  }

  queryText += '\n    returning *\n    ';

  const { rows } = await query(queryText, queryParams);

  return res.json(rows[0]);
});
export const requestWalkInPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existingRequest = (
    await query(
      `
      select id, deceased_full_name, calculated_total, contact_name, contact_phone, organizer_id, submitted_in_person
      from funeral_requests
      where id=$1
      limit 1
      `,
      [id]
    )
  ).rows[0];

  if (!existingRequest) {
    return res.status(404).json({ message: 'Request not found' });
  }

  if (!existingRequest.submitted_in_person) {
    return res.status(400).json({ message: 'Only walk-in requests can request in-person payment' });
  }

  const organizer = (
    await query(
      `
      select u.full_name
      from organizers o
      join users u on u.id = o.user_id
      where o.id=$1
      limit 1
      `,
      [existingRequest.organizer_id]
    )
  ).rows[0];

  const paymentResult = await sendWalkInPaymentRequest({
    contactName: existingRequest.contact_name,
    deceasedFullName: existingRequest.deceased_full_name,
    amount: existingRequest.calculated_total,
    organizerName: organizer?.full_name,
    contactPhone: existingRequest.contact_phone,
  });

  return res.json({
    ok: true,
    sent: paymentResult.sent,
    reason: paymentResult.reason,
    message: paymentResult.sent ? 'Walk-in payment request sent.' : 'Unable to send payment request SMS.',
  });
});

export const declineRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let existingRequest;
  if (req.user?.role === 'SUPER_ADMIN') {
    existingRequest = (
      await query(
        `
        select *
        from funeral_requests
        where id=$1
        limit 1
        `,
        [id]
      )
    ).rows[0];
  } else {
    const organizer = (
      await query(
        `
        select id
        from organizers
        where user_id=$1
        limit 1
        `,
        [req.user!.id]
      )
    ).rows[0];

    if (!organizer) {
      return res.status(403).json({
        message: 'Organizer profile not found',
      });
    }

    existingRequest = (
      await query(
        `
        select *
        from funeral_requests
        where id=$1
          and organizer_id=$2
        limit 1
        `,
        [id, organizer.id]
      )
    ).rows[0];
  }

  if (!existingRequest) {
    return res.status(404).json({
      message: 'Request not found or you do not have permission to decline it',
    });
  }

  if (existingRequest.status !== 'PENDING') {
    return res.status(400).json({
      message: `Only pending requests can be declined. Current status is ${existingRequest.status}`,
    });
  }

  const queryParams = [id];
  let queryText = `
    update funeral_requests
    set status='REJECTED'
    where id=$1
  `;

  if (req.user?.role !== 'SUPER_ADMIN') {
    queryText += ' and organizer_id=$2';
    queryParams.push(existingRequest.organizer_id);
  }

  queryText += '\n    returning *\n    ';

  const { rows } = await query(queryText, queryParams);

  return res.json(rows[0]);
});
export const listRequests = asyncHandler(async (req, res) => {
  const user = req.user!;

  if (user.role === 'ORGANIZER') {
    const organizer = (
      await query(
        `
        select id
        from organizers
        where user_id=$1
        limit 1
        `,
        [user.id]
      )
    ).rows[0];

    if (!organizer) {
      return res.json([]);
    }

    const { rows } = await query(
      `
      select
        fr.id,
        fr.family_member_id,
        fr.organizer_id,
        fr.deceased_full_name,
        fr.funeral_date,
        fr.budget,
        fr.guest_breakdown,
        fr.projected_attendance,
        fr.service_pricing_details,
        fr.calculated_total,
        fr.security_count,
        fr.usher_count,
        fr.logistics_chairs,
        fr.logistics_tables,
        fr.logistics_souvenirs,
        coalesce(fr.selected_services, '[]'::jsonb) as selected_services,
        fr.status,
        fr.accepted_at,
        fr.created_at,
        fr.submitted_in_person,
        fr.contact_name,
        fr.contact_phone,
        u.full_name as family_member_name,
        u.email as family_member_email,
        u.phone as family_member_phone
      from funeral_requests fr
      left join family_members fm on fm.id = fr.family_member_id
      left join users u on u.id = fm.user_id
      where fr.organizer_id = $1
      order by fr.created_at desc
      `,
      [organizer.id]
    );

    return res.json(rows);
  }

  if (user.role === 'FAMILY_MEMBER') {
    const familyMember = (
      await query(
        `
        select id
        from family_members
        where user_id=$1
        limit 1
        `,
        [user.id]
      )
    ).rows[0];

    if (!familyMember) {
      return res.json([]);
    }

    const { rows } = await query(
      `
      select
        fr.id,
        fr.family_member_id,
        fr.organizer_id,
        fr.deceased_full_name,
        fr.funeral_date,
        fr.budget,
        fr.guest_breakdown,
        fr.projected_attendance,
        fr.service_pricing_details,
        fr.calculated_total,
        fr.security_count,
        fr.usher_count,
        fr.logistics_chairs,
        fr.logistics_tables,
        fr.logistics_souvenirs,
        coalesce(fr.selected_services, '[]'::jsonb) as selected_services,
        fr.status,
        fr.accepted_at,
        fr.created_at,
        fr.submitted_in_person,
        fr.contact_name,
        fr.contact_phone,
        ou.full_name as organizer_name
      from funeral_requests fr
      join organizers o on o.id = fr.organizer_id
      join users ou on ou.id = o.user_id
      where fr.family_member_id = $1
      order by fr.created_at desc
      `,
      [familyMember.id]
    );

    return res.json(rows);
  }

  if (user.role === 'SUPER_ADMIN') {
    const { rows } = await query(
      `
      select
        fr.id,
        fr.family_member_id,
        fr.organizer_id,
        fr.deceased_full_name,
        fr.funeral_date,
        fr.budget,
        fr.guest_breakdown,
        fr.projected_attendance,
        fr.service_pricing_details,
        fr.calculated_total,
        fr.security_count,
        fr.usher_count,
        fr.logistics_chairs,
        fr.logistics_tables,
        fr.logistics_souvenirs,
        coalesce(fr.selected_services, '[]'::jsonb) as selected_services,
        fr.status,
        fr.accepted_at,
        fr.created_at,
        fr.submitted_in_person,
        fr.contact_name,
        fr.contact_phone,
        fu.full_name as family_member_name,
        fu.email as family_member_email,
        fu.phone as family_member_phone,
        ou.full_name as organizer_name
      from funeral_requests fr
      left join family_members fm on fm.id = fr.family_member_id
      left join users fu on fu.id = fm.user_id
      join organizers o on o.id = fr.organizer_id
      join users ou on ou.id = o.user_id
      order by fr.created_at desc
      limit 300
      `
    );

    return res.json(rows);
  }

  return res.json([]);
});
export const createSession = asyncHandler(async (req, res) => {
  const { requestId, deceasedFullName, illiterateFamilyRecordId } = req.body;

  let organizerId: string | null = null;
  let familyMemberId = null;
  let finalDeceasedFullName = deceasedFullName;
  let request: any = null;

  if (req.user?.role === 'SUPER_ADMIN') {
    if (requestId) {
      request = (
        await query(
          `
          select family_member_id, deceased_full_name, funeral_date, organizer_id
          from funeral_requests
          where id=$1
          `,
          [requestId]
        )
      ).rows[0];

      if (!request) {
        return res.status(404).json({ message: 'Request not found' });
      }

      organizerId = request.organizer_id;
      familyMemberId = request.family_member_id;
      finalDeceasedFullName = finalDeceasedFullName || request.deceased_full_name;
    } else {
      const requestedOrganizerId = req.body.organizerId ? String(req.body.organizerId).trim() : null;
      const requestedOrganizerIdentifier = req.body.organizerIdentifier ? String(req.body.organizerIdentifier).trim().toUpperCase() : null;

      if (requestedOrganizerId) {
        const result = await query('select id from organizers where id=$1 limit 1', [requestedOrganizerId]);
        organizerId = result.rows[0]?.id || null;
      } else if (requestedOrganizerIdentifier) {
        const result = await query('select id from organizers where upper(organizer_identifier)=$1 limit 1', [requestedOrganizerIdentifier]);
        organizerId = result.rows[0]?.id || null;
      }

      if (!organizerId) {
        return res.status(422).json({ message: 'Organizer ID or Organizer Identifier required for SUPER_ADMIN creating a session without a request' });
      }
    }
  } else {
    const organizer = (
      await query(
        'select id from organizers where user_id=$1',
        [req.user!.id]
      )
    ).rows[0];

    if (!organizer) {
      return res.status(403).json({ message: 'Organizer profile not found' });
    }

    organizerId = organizer.id;

    if (requestId) {
      request = (
        await query(
          `
          select family_member_id, deceased_full_name, funeral_date
          from funeral_requests
          where id=$1 and organizer_id=$2
          `,
          [requestId, organizer.id]
        )
      ).rows[0];

      if (request) {
        familyMemberId = request.family_member_id;
        finalDeceasedFullName = finalDeceasedFullName || request.deceased_full_name;
      }
    }
  }

  const code = `SES-${Date.now()}`;

  const { rows } = await query(
    `
    insert into funeral_sessions (
      request_id,
      session_meta,
      funeral_date,
      organizer_id,
      family_member_id,
      illiterate_family_record_id,
      deceased_full_name,
      session_code,
      status,
      budget_final
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    returning *
    `,
    [
      requestId || null,
      /* session_meta placeholder - will be replaced below if request snapshot exists */ null,
      request?.funeral_date || null,
      organizerId,
      familyMemberId,
      illiterateFamilyRecordId || null,
      finalDeceasedFullName,
      code,
      'PLANNING',
      null,
    ]
  );

  if (requestId) {
    // fetch request snapshot and copy into session_meta and budget_final
    const requestSnapshot = (
      await query(
        `select family_member_id, deceased_full_name, status, selected_services, service_pricing_details, calculated_total, budget, funeral_date from funeral_requests where id=$1 ${req.user?.role === 'SUPER_ADMIN' ? '' : 'and organizer_id=$2'} limit 1`,
        req.user?.role === 'SUPER_ADMIN' ? [requestId] : [requestId, organizerId]
      )
    ).rows[0];

    if (requestSnapshot) {
      if (requestSnapshot.status !== 'PAID') {
        throw { status: 400, message: 'Session can only be created after request payment is completed.' };
      }

      familyMemberId = requestSnapshot.family_member_id;
      finalDeceasedFullName = finalDeceasedFullName || requestSnapshot.deceased_full_name;

      const sessionMeta = { request_snapshot: requestSnapshot };
      await query(`update funeral_sessions set session_meta = coalesce(session_meta, '{}'::jsonb) || $1::jsonb, budget_final = coalesce($2, budget_final) where id=$3`, [sessionMeta, requestSnapshot.calculated_total || requestSnapshot.budget || null, rows[0].id]);
    }

    await query(`update funeral_requests set status='SESSION_CREATED' where id=$1`, [requestId]);
  }

  return res.status(201).json(rows[0]);
});
export const sessions = asyncHandler(async (req, res) => {
  const user = req.user!;

  if (user.role === 'SUPER_ADMIN') {
    const { rows } = await query(
      `
      select 
        fs.*,
        ou.full_name as organizer_name,
        fu.full_name as family_member_name
      from funeral_sessions fs
      join organizers o on o.id = fs.organizer_id
      join users ou on ou.id = o.user_id
      left join family_members fm on fm.id = fs.family_member_id
      left join users fu on fu.id = fm.user_id
      order by fs.created_at desc
      limit 200
      `
    );

    return res.json(rows);
  }

  if (user.role === 'ORGANIZER') {
    const organizer = (
      await query(
        'select id from organizers where user_id=$1',
        [user.id]
      )
    ).rows[0];

    const { rows } = await query(
      `
      select 
        fs.*,
        ou.full_name as organizer_name,
        fu.full_name as family_member_name
      from funeral_sessions fs
      join organizers o on o.id = fs.organizer_id
      join users ou on ou.id = o.user_id
      left join family_members fm on fm.id = fs.family_member_id
      left join users fu on fu.id = fm.user_id
      where fs.organizer_id = $1
      order by fs.created_at desc
      limit 200
      `,
      [organizer.id]
    );

    return res.json(rows);
  }

  if (user.role === 'FAMILY_MEMBER') {
    const familyMember = (
      await query(
        'select id from family_members where user_id=$1',
        [user.id]
      )
    ).rows[0];

    const { rows } = await query(
      `
      select distinct
        fs.*,
        ou.full_name as organizer_name,
        fu.full_name as family_member_name
      from funeral_sessions fs
      join organizers o on o.id = fs.organizer_id
      join users ou on ou.id = o.user_id
      left join family_members fm on fm.id = fs.family_member_id
      left join users fu on fu.id = fm.user_id
      left join funeral_requests fr on fr.id = fs.request_id
      where fs.family_member_id = $1
         or fr.family_member_id = $1
      order by fs.created_at desc
      limit 200
      `,
      [familyMember.id]
    );

    return res.json(rows);
  }

  return res.json([]);
});

export const getSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertSessionAccess(req, String(id));
  const { rows } = await query(
    `
    select fs.*, ou.full_name as organizer_name, fu.full_name as family_member_name
    from funeral_sessions fs
    join organizers o on o.id = fs.organizer_id
    join users ou on ou.id = o.user_id
    left join family_members fm on fm.id = fs.family_member_id
    left join users fu on fu.id = fm.user_id
    where fs.id = $1
    limit 1
    `,
    [id]
  );

  if (!rows[0]) return res.status(404).json({ message: 'Session not found' });
  return res.json(rows[0]);
});

export const updateSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertOrganizerAccess(req, String(id));

  const {
    funeralDate,
    budgetFinal,
    burialLocation,
    religiousArrangements,
    accommodationInfo,
    sessionMeta,
  } = req.body;

  // merge session_meta if provided
  if (sessionMeta) {
    await query(`update funeral_sessions set session_meta = coalesce(session_meta, '{}'::jsonb) || $1 where id=$2`, [sessionMeta, id]);
  }

  const updates: string[] = [];
  const params: any[] = [];
  if (funeralDate) { params.push(funeralDate); updates.push(`funeral_date=$${params.length}`); }
  if (budgetFinal || budgetFinal === 0) { params.push(budgetFinal); updates.push(`budget_final=$${params.length}`); }
  if (burialLocation) { params.push(JSON.stringify({ burial_location: burialLocation })); updates.push(`session_meta = coalesce(session_meta, '{}'::jsonb) || $${params.length}::jsonb`); }
  if (religiousArrangements) { params.push(JSON.stringify({ religious_arrangements: religiousArrangements })); updates.push(`session_meta = coalesce(session_meta, '{}'::jsonb) || $${params.length}::jsonb`); }
  if (accommodationInfo) { params.push(JSON.stringify({ accommodation_info: accommodationInfo })); updates.push(`session_meta = coalesce(session_meta, '{}'::jsonb) || $${params.length}::jsonb`); }

  if (updates.length>0){
    params.push(id);
    const sql = `update funeral_sessions set ${updates.join(', ')} where id=$${params.length}`;
    await query(sql, params);
  }

  const { rows } = await query('select * from funeral_sessions where id=$1', [id]);
  return res.json(rows[0]);
});

export const archiveSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // allow organizer to archive even if completed
  await assertOrganizerAccessAllowCompleted(req, String(id));

  const { rows } = await query(`update funeral_sessions set status='ARCHIVED', archived_at=now() where id=$1 returning *`, [id]);
  if (!rows[0]) return res.status(404).json({ message: 'Session not found' });
  try {
    await query(
      `insert into audit_logs(user_id, action, entity, entity_id, metadata, created_at)
       values ($1,$2,$3,$4,$5, now())`,
      [req.user?.id || null, 'ARCHIVE_SESSION', 'funeral_sessions', id, JSON.stringify({ previous_status: rows[0].status })]
    );
  } catch (e) {
    // non-fatal: audit failure should not block primary action
    console.error('Audit log failed:', e);
  }
  return res.json(rows[0]);
});

export const deleteSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // fetch session to check status and ownership
  const { rows: srows } = await query('select id, status, organizer_id from funeral_sessions where id=$1', [id]);
  const session = srows[0];
  if (!session) return res.status(404).json({ message: 'Session not found' });

  // allow super admin to delete any, organizers only their own
  if (req.user?.role !== 'SUPER_ADMIN') {
    const organizer = (await query('select id from organizers where user_id=$1', [req.user!.id])).rows[0];
    if (!organizer) return res.status(403).json({ message: 'Organizer profile not found' });
    if (organizer.id !== session.organizer_id) return res.status(403).json({ message: 'Not authorized for this session' });
  }

  if (session.status !== 'COMPLETED' && session.status !== 'ARCHIVED') {
    return res.status(403).json({ message: 'Only completed or archived sessions can be deleted' });
  }
  try {
    await query(
      `insert into audit_logs(user_id, action, entity, entity_id, metadata, created_at)
       values ($1,$2,$3,$4,$5, now())`,
      [req.user?.id || null, 'DELETE_SESSION', 'funeral_sessions', id, JSON.stringify({ status: session.status, organizer_id: session.organizer_id })]
    );
  } catch (e) {
    console.error('Audit log failed:', e);
  }

  await query('delete from funeral_sessions where id=$1', [id]);
  return res.json({ message: 'Deleted' });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Number(req.query.limit) || 50);
  const offset = Number(req.query.offset) || 0;
  const action = req.query.action ? String(req.query.action).trim() : null;
  const entity = req.query.entity ? String(req.query.entity).trim() : null;

  const params: any[] = [];
  const where: string[] = [];
  if (action) { params.push(action); where.push(`a.action = $${params.length}`); }
  if (entity) { params.push(entity); where.push(`a.entity = $${params.length}`); }

  params.push(limit);
  params.push(offset);

  const sql = `
    select a.id, a.user_id, u.full_name as user_name, a.action, a.entity, a.entity_id, a.metadata, a.ip, a.created_at
    from audit_logs a
    left join users u on u.id = a.user_id
    ${where.length ? `where ${where.join(' and ')}` : ''}
    order by a.created_at desc
    limit $${params.length-1} offset $${params.length}
  `;

  const { rows } = await query(sql, params);
  return res.json(rows);
});

export const getOneWeek = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertSessionAccess(req, String(id));
  const { rows } = await query(`select coalesce(session_meta->'one_week','{}'::jsonb) as one_week from funeral_sessions where id=$1`, [id]);
  if(!rows[0]) return res.status(404).json({ message: 'Session not found' });
  return res.json(rows[0].one_week || {});
});

export const updateOneWeek = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertOrganizerAccess(req, String(id));
  const payload = req.body;
  await query(`update funeral_sessions set session_meta = coalesce(session_meta, '{}'::jsonb) || jsonb_build_object('one_week', $1::jsonb) where id=$2`, [payload, id]);
  const { rows } = await query(`select session_meta->'one_week' as one_week from funeral_sessions where id=$1`, [id]);
  return res.json(rows[0].one_week || {});
});

export const getPlanning = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertSessionAccess(req, String(id));
  const { rows } = await query(`select coalesce(session_meta->'planning','{}'::jsonb) as planning from funeral_sessions where id=$1`, [id]);
  if(!rows[0]) return res.status(404).json({ message: 'Session not found' });
  return res.json(rows[0].planning || {});
});

export const updatePlanning = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertOrganizerAccess(req, String(id));
  const payload = req.body;
  // Allow updating top-level funeral_date only. Ignore any budgetFinal provided.
  const { funeralDate } = payload || {};
  if (funeralDate) {
    await query(`update funeral_sessions set funeral_date=$1 where id=$2`, [funeralDate, id]);
  }
  const payloadToSave = { ...payload };
  if (payloadToSave.hasOwnProperty('budgetFinal')) delete payloadToSave.budgetFinal;
  await query(`update funeral_sessions set session_meta = coalesce(session_meta, '{}'::jsonb) || jsonb_build_object('planning', $1::jsonb) where id=$2`, [payloadToSave, id]);
  const { rows } = await query(`select session_meta->'planning' as planning from funeral_sessions where id=$1`, [id]);
  return res.json(rows[0].planning || {});
});

// Checklists
export const listChecklists = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertSessionAccess(req, String(id));
  const { rows } = await query('select * from checklists where session_id=$1 order by due_at nulls last', [id]);
  return res.json(rows);
});

export const createChecklist = asyncHandler(async (req, res) => {
  const { id } = req.params; // session id
  const { title, dueAt } = req.body;
  if (!title) return res.status(422).json({ message: 'Title required' });
  const { rows } = await query('insert into checklists(session_id,title,due_at) values($1,$2,$3) returning *', [id, String(title).trim(), dueAt || null]);
  await updateSessionProgress(String(id));
  return res.status(201).json(rows[0]);
});

export const updateChecklist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, completed, dueAt } = req.body;
  const { rows } = await query('update checklists set title=coalesce($1,title), completed=coalesce($2,completed), due_at=coalesce($3,due_at) where id=$4 returning *', [title?String(title).trim():null, typeof completed === 'boolean' ? completed : null, dueAt || null, id]);
  if (rows[0]?.session_id) {
    await updateSessionProgress(rows[0].session_id);
  }
  return res.json(rows[0]);
});

export const deleteChecklist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rows } = await query('delete from checklists where id=$1 returning session_id', [id]);
  if (rows[0]?.session_id) {
    await updateSessionProgress(rows[0].session_id);
  }
  return res.json({ message: 'Deleted' });
});

// Timelines
export const listTimelines = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertSessionAccess(req, String(id));
  const { rows } = await query('select * from timelines where session_id=$1 order by event_at nulls last', [id]);
  return res.json(rows);
});

export const createTimeline = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, eventAt } = req.body;
  if (!title) return res.status(422).json({ message: 'Title required' });
  const { rows } = await query('insert into timelines(session_id,title,description,event_at) values($1,$2,$3,$4) returning *', [id, String(title).trim(), description?String(description).trim():null, eventAt||null]);
  return res.status(201).json(rows[0]);
});

export const getPreparations = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertSessionAccess(req, String(id));
  const { rows } = await query(`select coalesce(session_meta->'preparations','{}'::jsonb) as preparations from funeral_sessions where id=$1`, [id]);
  if(!rows[0]) return res.status(404).json({ message: 'Session not found' });
  return res.json(rows[0].preparations || {});
});

export const updatePreparations = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertOrganizerAccess(req, String(id));
  const payload = req.body;
  await query(`update funeral_sessions set session_meta = coalesce(session_meta, '{}'::jsonb) || jsonb_build_object('preparations', $1::jsonb) where id=$2`, [payload, id]);
  const { rows } = await query(`select session_meta->'preparations' as preparations from funeral_sessions where id=$1`, [id]);
  return res.json(rows[0].preparations || {});
});

export const updateTimeline = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, eventAt } = req.body;
  const { rows } = await query('update timelines set title=coalesce($1,title), description=coalesce($2,description), event_at=coalesce($3,event_at) where id=$4 returning *', [title?String(title).trim():null, description?String(description).trim():null, eventAt||null, id]);
  return res.json(rows[0]);
});

export const deleteTimeline = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query('delete from timelines where id=$1', [id]);
  return res.json({ message: 'Deleted' });
});

// Volunteers
export const listVolunteers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertSessionAccess(req, String(id));
  const { rows } = await query('select * from volunteers where session_id=$1', [id]);
  return res.json(rows);
});

export const createVolunteer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullName, phone, role } = req.body;
  if (!fullName) return res.status(422).json({ message: 'Full name required' });
  const { rows } = await query('insert into volunteers(session_id,full_name,phone,role) values($1,$2,$3,$4) returning *', [id, String(fullName).trim(), phone?String(phone).trim():null, role?String(role).trim():null]);
  return res.status(201).json(rows[0]);
});

export const updateVolunteer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullName, phone, role } = req.body;
  const { rows } = await query('update volunteers set full_name=coalesce($1,full_name), phone=coalesce($2,phone), role=coalesce($3,role) where id=$4 returning *', [fullName?String(fullName).trim():null, phone?String(phone).trim():null, role?String(role).trim():null, id]);
  return res.json(rows[0]);
});

export const deleteVolunteer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query('delete from volunteers where id=$1', [id]);
  return res.json({ message: 'Deleted' });
});

// Expenses
export const listExpenses = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertSessionAccess(req, String(id));
  const { rows } = await query('select * from expenses where session_id=$1 order by created_at desc', [id]);
  return res.json(rows);
});

export const createExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, amount, receiptDocumentId, description } = req.body;
  const finalTitle = title || description;
  if (!finalTitle) return res.status(422).json({ message: 'Title required' });
  const { rows } = await query('insert into expenses(session_id,title,amount,receipt_document_id) values($1,$2,$3,$4) returning *', [id, String(finalTitle).trim(), Number(amount)||0, receiptDocumentId||null]);
  return res.status(201).json(rows[0]);
});

export const updateExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, amount, description } = req.body;
  const newTitle = title ? String(title).trim() : (description ? String(description).trim() : null);
  const { rows } = await query('update expenses set title=coalesce($1,title), amount=coalesce($2,amount) where id=$3 returning *', [newTitle, amount||null, id]);
  return res.json(rows[0]);
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query('delete from expenses where id=$1', [id]);
  return res.json({ message: 'Deleted' });
});

// Notes
export const listNotes = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertSessionAccess(req, String(id));
  const { rows } = await query('select * from notes where session_id=$1 order by created_at desc', [id]);
  return res.json(rows);
});

export const createNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const note = req.body.note || req.body.content;
  if (!note) return res.status(422).json({ message: 'Note required' });
  const { rows } = await query('insert into notes(session_id,author_user_id,note) values($1,$2,$3) returning *', [id, req.user?.id||null, String(note).trim()]);
  return res.status(201).json(rows[0]);
});

export const deleteNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query('delete from notes where id=$1', [id]);
  return res.json({ message: 'Deleted' });
});

// Session services
export const listSessionServices = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertSessionAccess(req, String(id));
  const { rows } = await query('select * from session_services where session_id=$1', [id]);
  return res.json(rows);
});

export const addSessionService = asyncHandler(async (req, res) => {
  const { id } = req.params; // session id
  const { serviceId, name, price } = req.body;
  const { rows } = await query('insert into session_services(session_id,service_id,name,price) values($1,$2,$3,$4) returning *', [id, serviceId||null, name?String(name).trim():null, price||0]);
  return res.status(201).json(rows[0]);
});

export const removeSessionService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query('delete from session_services where id=$1', [id]);
  return res.json({ message: 'Deleted' });
});

export const addDonation = asyncHandler(async (req, res) => {
  const { sessionId, donorName, amount, paid, collectorName, collectorIdentifier, relativeName, relativeRelationship } = req.body;
  if (!sessionId) return res.status(422).json({ message: 'Session ID required' });
  if (!donorName || !String(donorName).trim()) return res.status(422).json({ message: 'Donor name required' });
  if (amount === undefined || amount === null || Number(amount) < 0) return res.status(422).json({ message: 'Valid amount required' });

  const verifiedSessionId = await assertSessionAccess(req, String(sessionId));

  let familyMemberId = null;
  let recorderName = null;
  if (req.user?.role === 'FAMILY_MEMBER') {
    const familyMember = (await query('select id from family_members where user_id=$1 limit 1', [req.user.id])).rows[0];
    if (familyMember) {
      familyMemberId = familyMember.id;
      const user = await query('select full_name from users where id=$1 limit 1', [req.user.id]);
      recorderName = user.rows[0]?.full_name || null;
    }
  } else if (req.user?.role === 'ORGANIZER' || req.user?.role === 'SUPER_ADMIN') {
    const user = await query('select full_name from users where id=$1 limit 1', [req.user.id]);
    recorderName = user.rows[0]?.full_name || null;
  }

  const { rows } = await query(
    'insert into donations(session_id,type,donor_name,amount,paid,collector_name,collector_identifier,family_member_id,relative_name,relative_relationship) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *',
    [
      verifiedSessionId,
      'CASH',
      String(donorName).trim(),
      Number(amount),
      Boolean(paid),
      recorderName || (collectorName ? String(collectorName).trim() : null),
      collectorIdentifier ? String(collectorIdentifier).trim() : null,
      familyMemberId,
      relativeName ? String(relativeName).trim() : null,
      relativeRelationship ? String(relativeRelationship).trim() : null,
    ]
  );
  res.status(201).json(rows[0]);
});

export const getDonation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rows } = await query(
    `select d.*, fs.session_code from donations d join funeral_sessions fs on fs.id = d.session_id where d.id=$1 limit 1`,
    [id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Donation not found' });
  await assertDonationAccess(req, String(id));
  res.json(rows[0]);
});

export const createSessionDonation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sessionId = await assertSessionAccess(req, String(id));
  const { donorName, amount, paid, collectorName, collectorIdentifier, donorPhone, checkedInAt, notes, relativeName, relativeRelationship } = req.body;
  if (!donorName || !String(donorName).trim()) return res.status(422).json({ message: 'Donor name required' });
  if (amount === undefined || amount === null || Number(amount) < 0) return res.status(422).json({ message: 'Valid amount required' });

  let familyMemberId = null;
  let recorderName = null;
  if (req.user?.role === 'FAMILY_MEMBER') {
    const familyMember = (await query('select id from family_members where user_id=$1 limit 1', [req.user.id])).rows[0];
    if (!familyMember) return res.status(403).json({ message: 'Family member profile not found' });
    familyMemberId = familyMember.id;
    const user = await query('select full_name from users where id=$1 limit 1', [req.user.id]);
    recorderName = user.rows[0]?.full_name || null;
  } else if (req.user?.role === 'ORGANIZER' || req.user?.role === 'SUPER_ADMIN') {
    const user = await query('select full_name from users where id=$1 limit 1', [req.user.id]);
    recorderName = user.rows[0]?.full_name || null;
  }

  const { rows } = await query(
    'insert into donations(session_id,type,donor_name,amount,paid,collector_name,collector_identifier,donor_phone,checked_in_at,notes,family_member_id,relative_name,relative_relationship) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *',
    [
      sessionId,
      'CASH',
      String(donorName).trim(),
      Number(amount),
      Boolean(paid),
      recorderName || (collectorName ? String(collectorName).trim() : null),
      collectorIdentifier ? String(collectorIdentifier).trim() : null,
      donorPhone ? String(donorPhone).trim() : null,
      checkedInAt ? String(checkedInAt).trim() : null,
      notes ? String(notes).trim() : null,
      familyMemberId,
      relativeName ? String(relativeName).trim() : null,
      relativeRelationship ? String(relativeRelationship).trim() : null,
    ]
  );
  res.status(201).json(rows[0]);
});

export const listDonations = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sessionId = await assertSessionAccess(req, String(id));

  if (req.user?.role === 'FAMILY_MEMBER') {
    const familyMember = (await query('select id from family_members where user_id=$1 limit 1', [req.user.id])).rows[0];
    if (!familyMember) return res.status(403).json({ message: 'Family member profile not found' });
    const { rows } = await query(
      'select * from donations where session_id=$1 and family_member_id=$2 order by created_at desc',
      [sessionId, familyMember.id]
    );
    return res.json(rows);
  }

  const { rows } = await query('select * from donations where session_id=$1 order by created_at desc', [sessionId]);
  res.json(rows);
});

export const updateDonation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  
  // Get donation to check ownership
  const { rows: donationRows } = await query('select * from donations where id=$1', [id]);
  if (!donationRows[0]) return res.status(404).json({ message: 'Donation not found' });
  
  const donation = donationRows[0];
  
  // Verify user has session access
  await assertDonationAccess(req, String(id));
  
  // If the user is a family member, require organizer approval to edit donations
  // Track a matching approved per-donation request id so we can mark it consumed after use
  let consumedRequestId: string | null = null;
  if (req.user?.role === 'FAMILY_MEMBER') {
    // load user's full name
    const { rows: userRows } = await query('select full_name from users where id=$1 limit 1', [req.user.id]);
    const fullName = userRows[0]?.full_name;
    // check session_collectors for an approved entry matching this family member name
    const { rows: scRows } = await query('select * from session_collectors where session_id=$1 and collector_name=$2 and approved=true limit 1', [donation.session_id, fullName]);
    if (!scRows[0]) {
      // allow if there's a per-donation approved edit request for this user
      const { rows: reqRows } = await query('select * from donation_edit_requests where donation_id=$1 and requester_user_id=$2 and status=$3 limit 1', [donation.id, req.user.id, 'APPROVED']);
      if (!reqRows[0]) {
        return res.status(403).json({ message: 'Awaiting organizer approval', code: 'APPROVAL_PENDING' });
      }
      consumedRequestId = reqRows[0].id;
    }
  }

  const { paid, donorName, amount, donorPhone, checkedInAt, notes, approved, approvalNotes } = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  if (donorName !== undefined) {
    params.push(String(donorName).trim());
    updates.push(`donor_name=$${params.length}`);
  }
  if (donorPhone !== undefined) {
    params.push(donorPhone ? String(donorPhone).trim() : null);
    updates.push(`donor_phone=$${params.length}`);
  }
  if (checkedInAt !== undefined) {
    params.push(checkedInAt ? String(checkedInAt).trim() : null);
    updates.push(`checked_in_at=$${params.length}`);
  }
  if (notes !== undefined) {
    params.push(notes ? String(notes).trim() : null);
    updates.push(`notes=$${params.length}`);
  }
  if (amount !== undefined) {
    params.push(Number(amount));
    updates.push(`amount=$${params.length}`);
  }
  if (paid !== undefined) {
    params.push(Boolean(paid));
    updates.push(`paid=$${params.length}`);
  }
  if (approved !== undefined) {
    params.push(Boolean(approved));
    updates.push(`approved=$${params.length}`);
    if (approved) {
      params.push(req.user?.id || null);
      updates.push(`approved_by=$${params.length}`);
    } else {
      updates.push(`approved_by = NULL`);
    }
  }
  if (approvalNotes !== undefined) {
    params.push(approvalNotes ? String(approvalNotes).trim() : null);
    updates.push(`approval_notes=$${params.length}`);
  }
  if (updates.length === 0) return res.status(400).json({ message: 'Nothing to update' });
  params.push(id);
  const { rows } = await query(`update donations set ${updates.join(', ')} where id=$${params.length} returning *`, params);

  // If amount was changed and a per-donation approved request was used, mark it consumed
  try {
    if (amount !== undefined && consumedRequestId) {
      await query('update donation_edit_requests set status=$1 where id=$2 and donation_id=$3', ['CONSUMED', consumedRequestId, donation.id]);
      // update consumed_at if column exists
      try { await query('update donation_edit_requests set consumed_at=now() where id=$1', [consumedRequestId]); } catch (e) { /* ignore */ }
    }
  } catch (e) {
    // non-fatal
  }

  res.json(rows[0]);
});

// Mobile-money donation requests removed; endpoint deleted.

export const completeSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertOrganizerAccess(req, String(id));
  const result = await completeSessionAndNotify(String(id));
  return res.json(result);
});

export const summary=asyncHandler(async(req,res)=>res.json(await generateSessionSummary(String(req.params.id))));

export const familyOverview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Access control is handled by route requireRoles middleware; additionally ensure session exists and is completed
  const session = (await query('select id,status from funeral_sessions where id=$1', [id])).rows[0];
  if (!session) return res.status(404).json({ message: 'Session not found' });
  if (session.status !== 'COMPLETED') return res.status(403).json({ message: 'Overview available only after the session is completed' });
  const overview = await generateFamilyOverview(String(id));
  res.json(overview);
});
