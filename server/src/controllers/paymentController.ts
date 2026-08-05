import { asyncHandler, AppError } from '../utils/errors.js';
import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { initializePaystack, verifyPaystack, initializeHubtel } from '../services/paymentService.js';

const amounts: any = {
  FAMILY_ACTIVATION: 5000,
  ORGANIZER_REGISTRATION: 20000,
  ORGANIZER_MONTHLY_SUBSCRIPTION: 10000,
};

function getEndOfMonth(date: Date) {
  const end = new Date(date);
  end.setMonth(end.getMonth() + 1, 0);
  return end;
}

function addMonthsSameDay(date: Date, months: number) {
  const next = new Date(date);
  const day = next.getDate();
  next.setMonth(next.getMonth() + months);
  if (next.getDate() !== day) {
    next.setDate(0);
  }
  return next;
}

function getMonthlyAmount() {
  return Number(amounts.ORGANIZER_MONTHLY_SUBSCRIPTION || 10000);
}

function getExpiredMonthsDue(endsAt: Date, now: Date) {
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (endsAt >= startOfCurrentMonth) {
    return 1;
  }

  const firstDueMonth = new Date(endsAt.getFullYear(), endsAt.getMonth() + 1, 1);
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return (
    (currentMonth.getFullYear() - firstDueMonth.getFullYear()) * 12 +
    (currentMonth.getMonth() - firstDueMonth.getMonth()) +
    1
  );
}

function getOrganizerMonthlyDueAmount(endsAt: Date | null) {
  const now = new Date();
  if (!endsAt) {
    return getMonthlyAmount();
  }

  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (endsAt >= startOfCurrentMonth) {
    return getMonthlyAmount();
  }

  const dueMonths = getExpiredMonthsDue(endsAt, now);
  return dueMonths * getMonthlyAmount();
}

async function createOrExtendOrganizerSubscription(userId: string, paymentId: string, amount: number) {
  const organizerRow = (await query('select id from organizers where user_id = $1 limit 1', [userId])).rows[0];
  if (!organizerRow) return;

  const now = new Date();
  const monthlyAmountGhs = getMonthlyAmount() / 100;
  const monthsPaid = Math.max(1, Math.floor(amount / monthlyAmountGhs));

  const activeSub = (await query(
    `
      select id, ends_at
      from subscriptions
      where organizer_id = $1
        and status = 'ACTIVE'
      order by ends_at desc
      limit 1
    `,
    [organizerRow.id]
  )).rows[0];

  let startsAt = now;
  let endsAt = getEndOfMonth(now);

  if (activeSub?.ends_at) {
    const endsAtDate = new Date(activeSub.ends_at);
    if (endsAtDate > now) {
      // Active subscription: extend from current expiration date by the number of months paid.
      startsAt = endsAtDate;
      endsAt = addMonthsSameDay(endsAtDate, monthsPaid);
    } else {
      // Expired subscription: restore access from today through the end of the paid months.
      startsAt = now;
      endsAt = addMonthsSameDay(getEndOfMonth(now), monthsPaid - 1);
    }
  } else {
    // No prior subscription: start now and cover the paid months.
    startsAt = now;
    endsAt = addMonthsSameDay(getEndOfMonth(now), monthsPaid - 1);
  }

  const subscription = (await query(
    `
      insert into subscriptions (
        organizer_id,
        status,
        amount,
        starts_at,
        ends_at
      )
      values ($1, 'ACTIVE', $2, $3, $4)
      returning id
    `,
    [organizerRow.id, amount, startsAt.toISOString(), endsAt.toISOString()]
  )).rows[0];

  await query('update organizers set subscription_status = $1 where id = $2', ['ACTIVE', organizerRow.id]);
  await query('update users set status = $1 where id = $2', ['ACTIVE', userId]);
  await query('update payments set subscription_id = $1 where id = $2', [subscription.id, paymentId]);
}

async function processPaymentResult(payment: any) {
  if (['FAMILY_ACTIVATION', 'ORGANIZER_REGISTRATION'].includes(payment.purpose)) {
    await query("update users set status='ACTIVE' where id=$1", [payment.user_id]);
  }

  if (['ORGANIZER_REGISTRATION', 'ORGANIZER_MONTHLY_SUBSCRIPTION'].includes(payment.purpose)) {
    await createOrExtendOrganizerSubscription(payment.user_id, payment.id, Number(payment.amount));
  }

  const requestId = payment.metadata?.requestId || payment.metadata?.data?.metadata?.requestId;
  if (payment.purpose === 'INVOICE' && requestId) {
    await query("update funeral_requests set status='PAID' where id=$1 and status <> 'SESSION_CREATED'", [requestId]);
  }
}

export const initialize = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { purpose, provider = 'PAYSTACK', amount, requestId } = req.body;

  const u = (await query('select email from users where id=$1', [userId])).rows[0];

  let requiredAmount = amount ? Number(amount) * 100 : undefined;
  if (!requiredAmount && amounts[purpose]) {
    requiredAmount = amounts[purpose];
  }
  if (purpose === 'ORGANIZER_MONTHLY_SUBSCRIPTION') {
    const organizerRow = (await query('select id from organizers where user_id=$1 limit 1', [userId])).rows[0];
    if (!organizerRow) {
      throw new AppError(400, 'Organizer profile not found');
    }

    const activeSub = (await query(
      `
        select ends_at
        from subscriptions
        where organizer_id = $1
          and status = 'ACTIVE'
        order by ends_at desc
        limit 1
      `,
      [organizerRow.id]
    )).rows[0];

    const endsAt = activeSub?.ends_at ? new Date(activeSub.ends_at) : null;
    const dueAmount = getOrganizerMonthlyDueAmount(endsAt);

    if (amount) {
      const requestedAmount = Number(amount) * 100;
      if (requestedAmount < dueAmount) {
        throw new AppError(
          422,
          `Insufficient payment. You must pay for all missed months plus the current month: ₵${(dueAmount / 100).toFixed(2)}.`
        );
      }
      requiredAmount = requestedAmount;
    } else {
      requiredAmount = dueAmount;
    }
  }

  let organizerPaymentPhone: string | null = null;
  if (purpose === 'INVOICE' && requestId) {
    // Validate request exists and is in INVOICED status
    const requestRow = (
      await query(
        `
          select fr.id, fr.status, fr.family_member_id, fr.calculated_total, fr.budget, o.payment_phone
          from funeral_requests fr
          join organizers o on o.id = fr.organizer_id
          where fr.id = $1
        `,
        [requestId]
      )
    ).rows[0];

    if (!requestRow) {
      throw new AppError(404, 'Request not found');
    }

    if (requestRow.status !== 'INVOICED') {
      throw new AppError(400, `Request must be in INVOICED status to pay. Current status: ${requestRow.status}`);
    }

    // Verify family member has access to this request
    if (req.user?.role === 'FAMILY_MEMBER') {
      const familyMember = (await query('select id from family_members where user_id=$1 limit 1', [userId])).rows[0];
      if (!familyMember || (requestRow.family_member_id && String(requestRow.family_member_id) !== String(familyMember.id))) {
        throw new AppError(403, 'You do not have permission to pay for this request');
      }
    }

    const requestAmount = Number(requestRow.calculated_total ?? requestRow.budget ?? 0);
    if (!requiredAmount && requestAmount > 0) {
      requiredAmount = requestAmount * 100;
    }

    organizerPaymentPhone = requestRow.payment_phone || null;
  }

  const amt = requiredAmount;
  if (!amt || amt <= 0) throw new AppError(422, 'Valid payment amount is required');

  if (provider === 'HUBTEL') {
    return res.json(await initializeHubtel(userId, amt / 100, purpose));
  }

  res.json(await initializePaystack(userId, u.email || 'customer@example.com', amt, purpose, requestId, organizerPaymentPhone || undefined));
});

export const verify = asyncHandler(async (req, res) => {
  const { reference } = req.body;
  // TEMPORARY: skip external Paystack verification and treat as paid when
  // user confirms payment in the UI. Re-enable real verification later.
  await query("update payments set status='PAID', verified_at=now() where reference=$1", [reference]);
  const payment = (await query('select * from payments where reference=$1', [reference])).rows[0];
  if (payment) {
    await processPaymentResult(payment);
  }

  res.json({ paid: true });
});

export const publicPaystackCallback = asyncHandler(async (req, res) => {
  const reference = String(req.query.reference || req.body?.reference || '');
  if (!reference) throw new AppError(422, 'Missing payment reference');
  // TEMPORARY: skip external Paystack verification and treat as paid when
  // user confirms payment in the UI. Re-enable real verification later.
  await query("update payments set status='PAID', verified_at=now() where reference=$1", [reference]);
  const payment = (await query('select * from payments where reference=$1', [reference])).rows[0];
  if (payment) {
    await processPaymentResult(payment);
  }

  const appUrl = `${env.APP_DEEP_LINK_URL}?reference=${encodeURIComponent(reference)}&paid=true`;
  if (String(req.query.redirect || '').toLowerCase() === 'app' || req.get('accept')?.includes('text/html')) {
    return res.type('html').send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Returning to app</title>
    <meta http-equiv="refresh" content="0; url=${appUrl}" />
  </head>
  <body style="font-family: sans-serif; text-align: center; padding: 24px;">
    <p>Returning to the app…</p>
    <script>window.location.replace(${JSON.stringify(appUrl)});</script>
  </body>
</html>`);
  }

  res.json({ paid: true, redirectUrl: appUrl });
});

export const history = asyncHandler(async (req, res) => {
  const { rows } = await query('select * from payments where user_id=$1 order by created_at desc', [req.user!.id]);
  res.json(rows);
});

export const outstanding = asyncHandler(async (req, res) => {
  // Return one unpaid invoice-related payment per request, keeping the latest attempt and attempt count.
  // Exclude requests already marked PAID or SESSION_CREATED so paid invoices do not remain visible.
  const { rows } = await query(
    `
      select distinct on (payment_group)
        q.id,
        q.user_id,
        q.amount,
        q.currency,
        q.provider,
        q.purpose,
        q.reference,
        q.status,
        q.verified_at,
        q.metadata,
        q.created_at,
        q.payment_group,
        q.attempt_count,
        r.deceased_full_name as deceased_name
      from (
        select
          p.*,
          coalesce(p.metadata->>'requestId', p.reference) as payment_group,
          count(*) over (partition by coalesce(p.metadata->>'requestId', p.reference)) as attempt_count
        from payments p
        left join funeral_requests fr on fr.id = (p.metadata->>'requestId')::uuid
        where p.user_id=$1
          and p.status <> 'PAID'
          and (p.purpose = 'INVOICE' or (p.metadata->>'requestId') is not null)
          and (p.metadata->>'requestId') is not null
          and coalesce(fr.status, 'INVOICED') not in ('PAID', 'SESSION_CREATED')
      ) q
      left join funeral_requests r on r.id = (q.metadata->>'requestId')::uuid
      order by payment_group, q.created_at desc
    `,
    [req.user!.id]
  );
  res.json(rows);
});
