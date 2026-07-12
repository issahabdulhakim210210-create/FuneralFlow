import bcrypt from 'bcryptjs';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { createPublicKey } from 'crypto';
import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { createOtp, verifyOtp } from '../services/otpService.js';
import { sendSms } from '../services/smsService.js';
import { signToken } from '../middleware/auth.js';
import { validEmail, validPhone, validStrongPassword } from '../utils/validation.js';

async function getOrganizerSubscriptionStatus(userId: string) {
  const organizer = (await query('select id, subscription_status from organizers where user_id=$1 limit 1', [userId])).rows[0];
  if (!organizer) {
    return { subscriptionStatus: 'INACTIVE', organizerId: null as string | null };
  }

  const latestSubscription = (await query(
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

  const active = latestSubscription?.ends_at && new Date(latestSubscription.ends_at) > new Date();
  return {
    subscriptionStatus: active ? 'ACTIVE' : 'INACTIVE',
    organizerId: organizer.id,
  };
}

function jwkToPem(jwk: any) {
  return createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: 'jwk' }).export({ type: 'spki', format: 'pem' }).toString();
}

let applePublicKeys: any[] | null = null;

async function getApplePublicKeys() {
  if (applePublicKeys) return applePublicKeys;
  const { data } = await axios.get('https://appleid.apple.com/auth/keys');
  applePublicKeys = data.keys;
  return applePublicKeys;
}

async function verifyGoogleToken(token: string) {
  const isJwt = token.split('.').length === 3;
  if (isJwt) {
    const { data } = await axios.get('https://oauth2.googleapis.com/tokeninfo', { params: { id_token: token } });
    if (!['https://accounts.google.com', 'accounts.google.com'].includes(data.iss)) {
      throw new AppError(401, 'Invalid Google token issuer');
    }
    if (env.GOOGLE_CLIENT_ID && data.aud !== env.GOOGLE_CLIENT_ID) {
      throw new AppError(401, 'Invalid Google client ID');
    }
    return {
      email: data.email,
      fullName: data.name || '',
      emailVerified: data.email_verified === 'true' || data.email_verified === true,
    };
  }

  const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!data.email) {
    throw new AppError(401, 'Invalid Google access token');
  }

  return {
    email: data.email,
    fullName: data.name || '',
    emailVerified: data.verified_email === true || data.verified_email === 'true' || data.email_verified === true || data.email_verified === 'true',
  };
}

async function verifyAppleToken(idToken: string) {
  const decoded = jwt.decode(idToken, { complete: true }) as any;
  if (!decoded || typeof decoded === 'string' || !decoded.header) {
    throw new AppError(401, 'Invalid Apple token');
  }

  const keys = (await getApplePublicKeys()) || [];
  const key = keys.find((k: any) => k.kid === decoded.header.kid);
  if (!key) {
    throw new AppError(401, 'Apple public key not found');
  }

  const publicKey = jwkToPem(key);
  const payload = jwt.verify(idToken, publicKey, {
    algorithms: ['RS256'],
    issuer: 'https://appleid.apple.com',
    audience: env.APPLE_AUDIENCE || undefined,
  }) as any;

  if (!payload.email) {
    throw new AppError(401, 'Apple token missing email');
  }

  return {
    email: payload.email,
    fullName: payload.name || '',
    emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
  };
}

function buildUserResponse(dbUser: any) {
  const subscriptionStatus = dbUser.role === 'ORGANIZER' ? dbUser.subscription_status || 'INACTIVE' : undefined;
  return {
    id: dbUser.id,
    role: dbUser.role,
    fullName: dbUser.full_name,
    email: dbUser.email,
    phone: dbUser.phone,
    status: dbUser.status,
    organizerIdentifier: dbUser.organizer_identifier,
    subscriptionStatus,
  };
}

export const requestOtp = asyncHandler(async (req, res) => {
  const method = String(req.body.method || '').trim();
  const email = req.body.email ? String(req.body.email).trim().toLowerCase() : null;
  const phone = req.body.phone ? String(req.body.phone).trim() : null;

  if (method === 'email') {
    if (!email || !validEmail(email)) {
      throw new AppError(422, 'Invalid email');
    }

    await createOtp(email);
    return res.json({ message: 'OTP sent to email' });
  }

  if (method === 'phone') {
    if (!phone || !validPhone(phone)) {
      throw new AppError(422, 'Invalid phone number. Use international format, e.g. +233XXXXXXXXX');
    }

    const code = await createOtp(phone);
    await sendSms(phone, `Your Funeral MS OTP is ${code}. It expires in 10 minutes.`);
    return res.json({ message: 'OTP sent to phone' });
  }

  throw new AppError(422, 'Invalid OTP method');
});

export const requestPasswordReset = asyncHandler(async (req, res) => {
  const phone = req.body.phone ? String(req.body.phone).trim() : null;

  if (!phone || !validPhone(phone)) {
    throw new AppError(422, 'Invalid phone number. Use international format, e.g. +233XXXXXXXXX');
  }

  const { rows } = await query('select id from users where phone=$1 limit 1', [phone]);
  if (!rows[0]) {
    return res.status(404).json({ message: 'No account found for that phone number' });
  }

  const code = await createOtp(phone);
  await sendSms(phone, `Your Funeral MS password reset code is ${code}. It expires in 10 minutes.`);
  return res.json({ message: 'Password reset code sent' });
});

export const confirmPasswordReset = asyncHandler(async (req, res) => {
  const phone = req.body.phone ? String(req.body.phone).trim() : null;
  const otp = String(req.body.otp || '').trim();
  const password = String(req.body.password || '');

  if (!phone || !validPhone(phone)) {
    throw new AppError(422, 'Invalid phone number. Use international format, e.g. +233XXXXXXXXX');
  }

  if (!otp) {
    throw new AppError(422, 'OTP is required');
  }

  if (!validStrongPassword(password)) {
    throw new AppError(422, 'Password must be at least 8 characters and include uppercase, lowercase, number and symbol');
  }

  const { rows } = await query('select id from users where phone=$1 limit 1', [phone]);
  const user = rows[0];
  if (!user) {
    return res.status(404).json({ message: 'No account found for that phone number' });
  }

  const otpValid = await verifyOtp(phone, otp);
  if (!otpValid) {
    throw new AppError(400, 'Invalid or expired OTP');
  }

  const hash = await bcrypt.hash(password, 12);
  await query('update users set password_hash=$1 where id=$2', [hash, user.id]);

  return res.json({ message: 'Password updated successfully' });
});

export const register = asyncHandler(async (req, res) => {
  const role = String(req.body.role || '').trim();
  const method = String(req.body.method || '').trim();

  const fullName = String(req.body.fullName || '').trim();
  const email = req.body.email ? String(req.body.email).trim().toLowerCase() : null;
  const phone = req.body.phone ? String(req.body.phone).trim() : null;
  const password = String(req.body.password || '');
  const otp = String(req.body.otp || '').trim();

  if (!['ORGANIZER', 'FAMILY_MEMBER'].includes(role)) {
    throw new AppError(422, 'Invalid public role');
  }

  if (!fullName) {
    throw new AppError(422, 'Full name is required');
  }

  if (method === 'email') {
    if (!email || !validEmail(email)) {
      throw new AppError(422, 'Invalid email');
    }
  }

  if (method === 'phone') {
    if (!phone || !validPhone(phone)) {
      throw new AppError(422, 'Invalid phone number. Use international format, e.g. +233XXXXXXXXX');
    }
  }

  if (!validStrongPassword(password)) {
    throw new AppError(
      422,
      'Password must be at least 8 characters and include uppercase, lowercase, number and symbol'
    );
  }

  const otpTarget = method === 'phone' ? phone : email;

  if (!otpTarget) {
    throw new AppError(422, 'OTP target is missing');
  }

  const otpIsValid = await verifyOtp(otpTarget, otp);

  if (!otpIsValid) {
    throw new AppError(400, 'Invalid or expired OTP');
  }

  const hash = await bcrypt.hash(password, 12);
  const status = 'PENDING_PAYMENT';

  const { rows } = await query(
    `
    insert into users (
      role,
      full_name,
      email,
      phone,
      password_hash,
      email_verified,
      phone_verified,
      status
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8)
    returning id, role, full_name, email, phone, status
    `,
    [
      role,
      fullName,
      email,
      phone,
      hash,
      method === 'email',
      method === 'phone',
      status,
    ]
  );

  const createdUser = rows[0];

  if (role === 'ORGANIZER') {
    await query(
      `
      insert into organizers (user_id, organizer_identifier)
      values ($1,$2)
      `,
      [
        createdUser.id,
        `ORG-${createdUser.id.slice(0, 8).toUpperCase()}`,
      ]
    );
  } else {
    await query(
      `
      insert into family_members (user_id)
      values ($1)
      `,
      [createdUser.id]
    );
  }

  const user = {
    id: createdUser.id,
    role: createdUser.role,
    fullName: createdUser.full_name,
    email: createdUser.email,
    phone: createdUser.phone,
    status: createdUser.status,
    subscriptionStatus: role === 'ORGANIZER' ? 'INACTIVE' : undefined,
  };

  return res.status(201).json({
    token: signToken({
      id: user.id,
      role: user.role,
      status: user.status,
    }),
    user,
  });
});

export const oauthRegister = asyncHandler(async (req, res) => {
  const role = String(req.body.role || '').trim();
  const method = String(req.body.method || '').trim();
  const idToken = String(req.body.idToken || '').trim();
  const fullName = String(req.body.fullName || '').trim();
  const email = req.body.email ? String(req.body.email).trim().toLowerCase() : null;
  const phone = req.body.phone ? String(req.body.phone).trim() : null;

  if (!['ORGANIZER', 'FAMILY_MEMBER'].includes(role)) {
    throw new AppError(422, 'Invalid public role');
  }

  if (!['google', 'apple'].includes(method)) {
    throw new AppError(422, 'Invalid oauth method');
  }

  if (!idToken) {
    throw new AppError(422, 'Identity token is required');
  }

  if (!email && !phone) {
    throw new AppError(422, 'Email or phone is required');
  }

  if (email && !validEmail(email)) {
    throw new AppError(422, 'Invalid email');
  }

  if (phone && !validPhone(phone)) {
    throw new AppError(422, 'Invalid phone number. Use international format, e.g. +233XXXXXXXXX');
  }

  const tokenInfo = method === 'google'
    ? await verifyGoogleToken(idToken)
    : await verifyAppleToken(idToken);

  const providerEmail = tokenInfo.email || email;
  const providerFullName = tokenInfo.fullName || fullName;
  const emailVerified = !!tokenInfo.emailVerified || !!providerEmail;
  const phoneVerified = !!phone;

  if (!providerFullName) {
    throw new AppError(422, 'Full name is required from the identity provider');
  }

  if (!providerEmail && !phone) {
    throw new AppError(422, 'Email or phone is required');
  }

  if (providerEmail && email && providerEmail.toLowerCase() !== email.toLowerCase()) {
    throw new AppError(401, 'Token email does not match provided email');
  }

  const { rows: existingRows } = await query(
    `select u.*, o.organizer_identifier, o.subscription_status
     from users u
     left join organizers o on o.user_id = u.id
     where ($1 is not null and lower(u.email) = lower($1))
       or ($2 is not null and u.phone = $2)
     limit 1`,
    [providerEmail, phone]
  );

  if (existingRows[0]) {
    const existingUser = existingRows[0];
    if (existingUser.role !== role) {
      throw new AppError(409, 'Account exists with a different role');
    }
    const user = buildUserResponse(existingUser);
    return res.json({
      token: signToken({ id: user.id, role: user.role, status: user.status }),
      user,
    });
  }

  const status = 'PENDING_PAYMENT';
  const { rows } = await query(
    `
    insert into users (
      role,
      full_name,
      email,
      phone,
      password_hash,
      email_verified,
      phone_verified,
      status
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8)
    returning id, role, full_name, email, phone, status
    `,
    [
      role,
      providerFullName,
      providerEmail,
      phone,
      null,
      emailVerified,
      phoneVerified,
      status,
    ]
  );

  const createdUser = rows[0];

  if (role === 'ORGANIZER') {
    await query(
      `
      insert into organizers (user_id, organizer_identifier)
      values ($1,$2)
      `,
      [
        createdUser.id,
        `ORG-${createdUser.id.slice(0, 8).toUpperCase()}`,
      ]
    );
  } else {
    await query(
      `
      insert into family_members (user_id)
      values ($1)
      `,
      [createdUser.id]
    );
  }

  const { rows: userRows } = await query(
    `select u.*, o.organizer_identifier, o.subscription_status
     from users u
     left join organizers o on o.user_id = u.id
     where u.id = $1`,
    [createdUser.id]
  );

  const user = buildUserResponse(userRows[0]);

  return res.status(201).json({
    token: signToken({
      id: user.id,
      role: user.role,
      status: user.status,
    }),
    user,
  });
});

export const login = asyncHandler(async (req, res) => {
  const role = String(req.body.role || '').trim();
  const identifier = String(req.body.identifier || '').trim();
  const password = String(req.body.password || '');

  if (!['SUPER_ADMIN', 'ORGANIZER', 'FAMILY_MEMBER'].includes(role)) {
    throw new AppError(422, 'Role is required');
  }

  const { rows } = await query(
    `
    select 
      u.*,
      o.organizer_identifier
    from users u
    left join organizers o on o.user_id = u.id
    where lower(u.email) = lower($1)
       or u.phone = $1
    limit 1
    `,
    [identifier]
  );

  const dbUser = rows[0];

  if (!dbUser || dbUser.role !== role || !(await bcrypt.compare(password, dbUser.password_hash))) {
    throw new AppError(401, 'Invalid credentials');
  }

  if (dbUser.status === 'DELETED') {
    throw new AppError(403, 'Account deleted');
  }

  let subscriptionStatus: string | undefined;

  if (dbUser.role === 'ORGANIZER') {
    const organizer = (await query('select id, subscription_status from organizers where user_id=$1 limit 1', [dbUser.id])).rows[0];
    if (organizer) {
      const subRow = (await query(
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

      const activeSubscription = subRow?.ends_at && new Date(subRow.ends_at) > new Date();
      subscriptionStatus = activeSubscription ? 'ACTIVE' : 'INACTIVE';

      if (!activeSubscription && dbUser.status === 'ACTIVE') {
        await query("update users set status='SUSPENDED' where id=$1", [dbUser.id]);
        await query('update organizers set subscription_status=$1 where id=$2', ['INACTIVE', organizer.id]);
        dbUser.status = 'SUSPENDED';
      }
    }
  }

  const user = {
    id: dbUser.id,
    role: dbUser.role,
    fullName: dbUser.full_name,
    email: dbUser.email,
    phone: dbUser.phone,
    status: dbUser.status,
    organizerIdentifier: dbUser.organizer_identifier,
    subscriptionStatus,
  };

  return res.json({
    token: signToken({
      id: dbUser.id,
      role: dbUser.role,
      status: dbUser.status,
    }),
    user,
  });
});

export const me = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `
    select
      u.id,
      u.role,
      u.full_name,
      u.email,
      u.phone,
      u.status,
      o.id as organizer_id,
      o.organizer_identifier,
      o.subscription_status,
      (
        select ends_at
        from subscriptions
        where organizer_id = o.id
          and status = 'ACTIVE'
        order by ends_at desc
        limit 1
      ) as subscription_ends_at
    from users u
    left join organizers o on o.user_id = u.id
    where u.id = $1
    limit 1
    `,
    [req.user!.id]
  );

  const current = rows[0];

  if (!current) {
    throw new AppError(404, 'User not found');
  }

  let status = current.status;
  let subscriptionStatus = current.subscription_status || (current.role === 'ORGANIZER' ? 'INACTIVE' : undefined);
  const subscriptionEndsAt = current.subscription_ends_at || null;

  if (current.role === 'ORGANIZER' && current.organizer_id) {
    const subscriptionActive = subscriptionEndsAt && new Date(subscriptionEndsAt) > new Date();
    if (!subscriptionActive && status === 'ACTIVE') {
      await query("update users set status='SUSPENDED' where id=$1", [current.id]);
      await query('update organizers set subscription_status=$1 where id=$2', ['INACTIVE', current.organizer_id]);
      status = 'SUSPENDED';
      subscriptionStatus = 'INACTIVE';
    }
  }

  const user = {
    id: current.id,
    role: current.role,
    fullName: current.full_name,
    email: current.email,
    phone: current.phone,
    status,
    organizerIdentifier: current.organizer_identifier,
    subscriptionStatus,
    subscriptionEndsAt,
  };

  res.json(user);
});