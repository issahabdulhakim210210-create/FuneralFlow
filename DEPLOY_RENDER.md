Render deployment guide

1. Connect the GitHub repo
- Go to https://dashboard.render.com and connect your GitHub account.
- Create two services:
  - Web Service: point to the `server/` root (the server package.json). Use `npm install` as build command and `npm run build && npm start` as start command (render.yaml uses `npm run build` + `npm start`).
  - Static Site: point to the repository root and use the `frontend/` directory as the publish directory. Or use the render.yaml provided which defines a `static` service that runs `cd frontend && npm run build:web` and serves `web-build`.

2. Configure environment variables
- In Render's dashboard, for the server service, add the following environment variables (values are examples):
  - `DATABASE_URL` — your Postgres connection string
  - `JWT_SECRET` — strong secret
  - `PORT` — optional (Render provides a port automatically)
  - `PAYSTACK_SECRET_KEY`, `CLOUDINARY_*`, `TWILIO_*`, etc. as required by the app
- For the frontend static site, add `EXPO_PUBLIC_API_URL` pointing to your server's public URL (e.g. `https://funeralflow-server.onrender.com/api`).

3. Add GitHub secrets (optional, for GitHub Actions deploy)
- Add repository secrets:
  - `RENDER_API_KEY` — a Render API key (create in Render dashboard under Account -> API Keys)
  - `RENDER_SERVICE_ID_SERVER` — the service ID from Render for the server (found in service settings URL or API)
  - `RENDER_SERVICE_ID_FRONTEND` — service ID for the frontend static site

4. Push to `main`
- Locally run:

```bash
git add .
git commit -m "Prepare Render deployment and add build scripts"
git push origin main
```

If you prefer, the GitHub Action (`.github/workflows/deploy-to-render.yml`) will trigger on pushes to `main` and call the Render Deploy API to trigger new deploys (requires the three secrets above).

Notes
- The server already reads environment variables via `server/src/config/env.ts`.
- The frontend expects `EXPO_PUBLIC_API_URL` at build time to be set by Render's environment variables so the exported static site will have the correct API URL baked in.
- If you want the frontend served as a Node process instead of static assets, adjust `render.yaml` and `frontend/package.json` accordingly.

If you want, I can create a commit and push to the remote repo for you — you'll need to grant me access or run the `git` commands locally. If you'd like me to attempt an automated push from this environment, confirm and provide the remote `origin` URL and credentials (I cannot accept secrets here; better to run the git push locally).