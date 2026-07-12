# Funeral Management System

A production-oriented full-stack mobile application scaffold for Android and iOS using **React Native + Expo + TypeScript + NativeWind** with a **Node.js/Express/PostgreSQL** backend.

This project intentionally does **not** use Expo Router. It includes a custom internal file-based screen registry and a typed navigator built on React Navigation.

## What is included

- Expo React Native frontend with beautiful NativeWind UI
- Custom internal routing under `src/navigation/routes.ts`
- Context API + Zustand stores
- Organizer, Family Member, and hidden Super Admin flows
- Email/phone OTP auth, Google/Apple auth API placeholders, JWT, RBAC
- Paystack and Hubtel payment service integration patterns
- Payment verification endpoints and audit logs
- Funeral requests, sessions, checklist, timelines, donations, documents, summaries
- Cloudinary document vault integration
- Firebase Cloud Messaging registration endpoint
- Africa's Talking and Twilio SMS abstractions
- Complete PostgreSQL schema with constraints, indexes and RLS starter policies
- Deployment and setup guide

> You must provide real provider credentials in `.env` files before using live authentication, payments, SMS, push notifications, or uploads.

## Repository layout

```txt
funeral-management-system/
  frontend/        Expo React Native mobile app
  server/          Express API backend
  database/        PostgreSQL schema and seed SQL
  docs/            Deployment/security notes
```

## Prerequisites

Install these on your PC:

1. Node.js 20+
2. npm 10+
3. Expo Go app on your Android/iOS phone, or Android Studio/Xcode emulator
4. PostgreSQL 15+ locally
5. Git (recommended)

## 0. Docker setup

This repository now includes Docker support for the backend and PostgreSQL. Use Docker when you want a containerized local environment instead of installing PostgreSQL locally.

1. Copy `server/.env.example` to `server/.env` and fill in any required secrets.
2. Run:

```bash
docker compose up --build
```

The API will be available at `http://localhost:4000/api` and the PostgreSQL database at port `5432`.

> The frontend is still a React Native/Expo app, so the backend and database are containerized while the mobile app runs on your device or emulator.

## 1. Database setup

### Local PostgreSQL

```bash
createdb funeral_management
psql funeral_management -f database/schema.sql
psql funeral_management -f database/seed.sql
```

## 2. Backend setup

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Edit `server/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/funeral_management
JWT_SECRET=replace-with-long-random-secret
PAYSTACK_SECRET_KEY=sk_test_xxx
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+15551234567
# or use TWILIO_FROM=+15551234567
```

Twilio SMS is now used for phone OTP and password reset flows whenever those credentials are present.

API health check:

```bash
curl http://localhost:4000/api/health
```

## 3. Frontend setup

```bash
cd frontend
cp .env.example .env
npm install
npm start
```

Set `EXPO_PUBLIC_API_URL` in `frontend/.env`:

- Android emulator: `http://10.0.2.2:4000/api`
- iOS simulator: `http://localhost:4000/api`
- Physical phone: `http://YOUR_PC_LOCAL_IP:4000/api`

Open the Expo QR code using Expo Go.

## Hidden Super Admin access

The frontend includes a hidden dashboard entry. Tap the landing page title 7 times to open the admin login route. Backend still requires a user with role `SUPER_ADMIN`.

## Default seed users

`seed.sql` creates roles and service categories only. Create the first Super Admin manually:

```sql
insert into users (role, full_name, email, password_hash, email_verified, status)
values ('SUPER_ADMIN', 'Platform Owner', 'admin@example.com', '$2b$12$CHANGE_ME', true, 'ACTIVE');
```

Generate bcrypt hash:

```bash
cd server
node -e "require('bcryptjs').hash('Admin@12345',12).then(console.log)"
```

## Important production checklist

- Use HTTPS behind a reverse proxy or managed platform.
- Set strong `JWT_SECRET` and provider secrets.
- Configure Paystack/Hubtel webhooks to backend callback URLs.
- Configure Firebase APNs for iOS and FCM for Android.
- Enable PostgreSQL backups and RLS policies.
- Review legal compliance for financial/audit records in your country.

See `docs/DEPLOYMENT.md` and `docs/SECURITY.md`.



