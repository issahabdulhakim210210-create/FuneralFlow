import { query } from '../config/db.js';
import { notifyUser } from './notificationService.js';

export async function generateSessionSummary(sessionId: string) {
  const session = (await query('select * from funeral_sessions where id=$1', [sessionId])).rows[0];
  const services = (await query('select * from session_services where session_id=$1', [sessionId])).rows;
  const expenses = (await query('select * from expenses where session_id=$1', [sessionId])).rows;
  const donations = (await query('select * from donations where session_id=$1', [sessionId])).rows;
  const timelines = (await query('select * from timelines where session_id=$1', [sessionId])).rows;
  const volunteers = (await query('select * from volunteers where session_id=$1', [sessionId])).rows;
  const checklists = (await query('select * from checklists where session_id=$1', [sessionId])).rows;
  const notes = (await query('select * from notes where session_id=$1', [sessionId])).rows;

  const totalExpenses = expenses.reduce((s: any, e: any) => s + Number(e.amount || 0), 0);
  const totalDonations = donations.reduce((s: any, d: any) => {
    if (!d.approved || !d.paid) return s;
    return s + Number(d.amount || d.estimated_value || 0);
  }, 0);
  const checkedItems = checklists.filter((c: any) => c.completed).length;

  const report = {
    session: {
      id: session.id,
      deceasedName: session.deceased_full_name,
      sessionCode: session.session_code,
      status: session.status,
      createdAt: session.created_at,
      completedAt: new Date().toISOString(),
    },
    planning: session.session_meta?.planning || {},
    services: services.map((s: any) => ({
      name: s.name,
      price: s.price,
    })),
    activities: {
      timelines: timelines.map((t: any) => ({
        title: t.title,
        description: t.description,
        date: t.event_at,
      })),
      volunteers: volunteers.map((v: any) => ({
        name: v.full_name,
        phone: v.phone,
        role: v.role,
      })),
      tasksCompleted: `${checkedItems}/${checklists.length}`,
      notes: notes.length,
    },
    financialSummary: {
      totalExpenses: Number(totalExpenses.toFixed(2)),
      totalDonations: Number(totalDonations.toFixed(2)),
      netBalance: Number((totalDonations - totalExpenses).toFixed(2)),
      expenses: expenses.map((e: any) => ({
        description: e.title,
        amount: e.amount,
        date: e.created_at,
      })),
      donations: donations.map((d: any) => ({
        type: d.type,
        donor: d.donor_name,
        amount: d.amount || d.estimated_value,
        date: d.donated_at,
      })),
    },
    generatedAt: new Date().toISOString(),
  };

  const { rows } = await query(
    'insert into session_summaries(session_id,summary_json) values($1,$2) returning *',
    [sessionId, report]
  );

  return rows[0];
}

function removeMonetaryFields(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(removeMonetaryFields);

  const sanitized: any = {};
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (['budget', 'budgetfinal', 'calculated_total', 'calculatedtotal', 'estimated_total', 'amount', 'total', 'price', 'cost', 'donation', 'expense'].some((k) => lowerKey.includes(k))) {
      continue;
    }
    sanitized[key] = removeMonetaryFields(obj[key]);
  }
  return sanitized;
}

export async function generateFamilyOverview(sessionId: string) {
  const session = (await query('select * from funeral_sessions where id=$1', [sessionId])).rows[0];
  const services = (await query('select * from session_services where session_id=$1', [sessionId])).rows;
  const timelines = (await query('select * from timelines where session_id=$1', [sessionId])).rows;
  const volunteers = (await query('select * from volunteers where session_id=$1', [sessionId])).rows;
  const checklists = (await query('select * from checklists where session_id=$1 order by title asc', [sessionId])).rows;
  const notes = (await query('select * from notes where session_id=$1', [sessionId])).rows;
  const donations = (await query('select id,type,donor_name,donated_at from donations where session_id=$1 order by donated_at desc', [sessionId])).rows;
  const expenses = (await query('select id,title,created_at from expenses where session_id=$1 order by created_at desc', [sessionId])).rows;

  const report = {
    session: {
      id: session.id,
      deceasedName: session.deceased_full_name,
      sessionCode: session.session_code,
      status: session.status,
      createdAt: session.created_at,
      completedAt: new Date().toISOString(),
    },
    planning: removeMonetaryFields(session.session_meta?.planning || {}),
    services: services.map((s: any) => ({ name: s.name })),
    activities: {
      timelines: timelines.map((t: any) => ({ title: t.title, description: t.description, date: t.event_at })),
      volunteers: volunteers.map((v: any) => ({ name: v.full_name, phone: v.phone, role: v.role })),
      notes: notes.map((n: any) => ({ content: n.note || n.content, createdAt: n.created_at })),
    },
    checklistLog: checklists.map((c: any) => ({ id: c.id, title: c.title, completed: !!c.completed, assignedTo: c.assigned_to || null, createdAt: c.due_at || null, completedAt: c.completed_at || null })),
    financial: {
      donationCount: donations.length,
      expenseCount: expenses.length,
      // Do not include any monetary values per family-facing policy
      donations: donations.map((d: any) => ({ id: d.id, type: d.type, donor: d.donor_name, date: d.donated_at })),
      expenses: expenses.map((e: any) => ({ id: e.id, description: e.title, date: e.created_at })),
    },
    generatedAt: new Date().toISOString(),
  };

  return report;
}

export async function completeSessionAndNotify(sessionId: string, organizerId?: string) {
  try {
    // Update session status to COMPLETED
    const { rows: sessionRows } = await query(
      'update funeral_sessions set status=$1, completed_at=$2 where id=$3 returning *',
      ['COMPLETED', new Date(), sessionId]
    );

    const session = sessionRows[0];
    if (!session) throw { status: 404, message: 'Session not found' };

    // Generate summary
    const summary = await generateSessionSummary(sessionId);

    // Send notification to family member if available
    if (session.family_member_id) {
      const familyMember = (
        await query('select u.id, u.email from family_members f join users u on f.user_id=u.id where f.id=$1', [
          session.family_member_id,
        ])
      ).rows[0];

        if (familyMember) {
          // generate family-friendly overview (no monetary values)
          const familyOverview = await generateFamilyOverview(sessionId);
          await notifyUser(
            familyMember.id,
            'Funeral Session Completed',
            `The funeral planning session for ${session.deceased_full_name} has been completed. A brief overview has been sent to you.`,
            {
              sessionId,
              summaryId: summary.id,
              sessionCode: session.session_code,
              overview: familyOverview,
            }
          );
        }
    }

    return { session: sessionRows[0], summary };
  } catch (error: any) {
    throw error;
  }
}
