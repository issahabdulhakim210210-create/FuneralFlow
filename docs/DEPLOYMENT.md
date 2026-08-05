# Production Deployment Guide

## Backend

Recommended targets: Render, Railway, Fly.io, AWS ECS, DigitalOcean App Platform.

Use Render with a managed Neon Postgres database by setting `DATABASE_URL` to your Neon connection string. The repository includes `render.yaml`, so Render can deploy the backend from `server/` and the frontend from `frontend/` without committing local `.env` files.

1. Provision PostgreSQL (Neon or another managed provider).
2. Set all environment variables from `server/.env.example`.
3. Run migrations: `psql $DATABASE_URL -f database/schema.sql`.
4. Build: `npm run build`.
5. Start: `npm start`.
6. Put the API behind HTTPS. Set `trust proxy` enabled (already done).
7. Configure Paystack webhooks/callbacks to `/api/payments/verify` or a dedicated webhook endpoint.

## Mobile

Use EAS Build:

```bash
npm install -g eas-cli
cd frontend
eas login
eas build:configure
eas build --platform android
eas build --platform ios
```

Configure Firebase FCM and Apple push certificates before store release.
