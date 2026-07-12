import { asyncHandler } from '../utils/errors.js';
import { query } from '../config/db.js';
import { AppError } from '../utils/errors.js';

export const updateOrganizerProfile = asyncHandler(async (req, res) => {
  const paymentPhone = req.body.paymentPhone ? String(req.body.paymentPhone).trim() : null;

  await query(
    `update organizers set payment_phone=$1 where user_id=$2 returning payment_phone`,
    [paymentPhone, req.user!.id]
  );

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
    throw new AppError(404, 'Organizer profile not found');
  }

  res.json(rows[0]);
});
