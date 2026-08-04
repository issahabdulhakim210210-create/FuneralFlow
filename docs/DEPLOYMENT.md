# Production Deployment Guide

## Backend

Recommended targets: Render, Railway, Fly.io, AWS ECS, DigitalOcean App Platform.

1. Provision PostgreSQL.
2. Set all environment variables from `server/.env.example`.
   - On Render, do not commit `server/.env`; configure environment variables in Render's dashboard.
   - This backend prefers `DATABASE_URL`, but it also supports Spring-style Neon env vars as a fallback:
     - `SPRING_DATASOURCE_URL`
     - `SPRING_DATASOURCE_USERNAME`
     - `SPRING_DATASOURCE_PASSWORD`
     - `SPRING_JPA_HIBERNATE_DDL_AUTO`
     - `SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT`
   - If `SPRING_DATASOURCE_URL` is set, the backend will use it when `DATABASE_URL` is not provided.
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
