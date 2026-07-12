import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { query } from '../config/db.js';

export type Role = 'SUPER_ADMIN' | 'ORGANIZER' | 'FAMILY_MEMBER';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role; status: string };
    }
  }
}

export function signToken(payload: any) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
}

export function authenticate(req: any, res: any, next: any) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) throw new AppError(401, 'Missing bearer token', 'NO_TOKEN');

  try {
    req.user = jwt.verify(h.slice(7), env.JWT_SECRET);
    next();
  } catch {
    throw new AppError(401, 'Invalid or expired token', 'INVALID_TOKEN');
  }
}

export const requireRoles = (...roles: Role[]) => (req: any, res: any, next: any) => {
  if (!req.user) throw new AppError(401, 'Authentication required');
  if (!roles.includes(req.user.role)) throw new AppError(403, 'Forbidden');
  next();
};

export async function requireActive(req: any, res: any, next: any) {
  try {
    const currentUser = (await query('select status, role from users where id=$1 limit 1', [req.user.id])).rows[0];
    if (!currentUser) {
      throw new AppError(401, 'Authentication required');
    }

    if (currentUser.status !== 'ACTIVE') {
      throw new AppError(402, 'Account is not active');
    }

    if (currentUser.role === 'ORGANIZER') {
      const organizer = (await query('select id from organizers where user_id=$1 limit 1', [req.user.id])).rows[0];
      if (!organizer) {
        throw new AppError(403, 'Organizer profile not found');
      }

      const subscription = (await query(
        `
        select ends_at
        from subscriptions
        where organizer_id=$1
          and status='ACTIVE'
        order by ends_at desc
        limit 1
        `,
        [organizer.id]
      )).rows[0];

      if (!subscription?.ends_at || new Date(subscription.ends_at) <= new Date()) {
        await query("update users set status='SUSPENDED' where id=$1", [req.user.id]);
        await query('update organizers set subscription_status=$1 where id=$2', ['INACTIVE', organizer.id]);
        throw new AppError(402, 'Subscription expired. Renew to continue using organizer features.');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

