# NEXUS HRMS Handover

## Project

- Product: `NEXUS HRMS`
- Company: `Meta Labs Tech`
- Repository root: `C:\Users\razaa\Documents\New project`
- Frontend workspace: `client/`
- Backend workspace: `server/`

## Current delivery status

This delivery includes:

- role-based portals
- dedicated Settings module
- avatar upload with crop/zoom/frame adjustment
- employee project workspace access
- internal gigs apply flow with applied-state feedback
- profile/security/session management
- deployment-ready frontend and backend workspaces

## Final verification

The following were run successfully on the delivered code:

- `npm --workspace client run typecheck`
- `npm --workspace server run typecheck`
- `npm run test`
- `npm run build`

## Deployment targets

- Frontend: `Vercel`
- Backend: `Railway`
- Database: `MongoDB Atlas`
- Redis/queue: `Redis Cloud` or Railway Redis

## Vercel frontend deployment

Create or update the Vercel project with these settings:

- Root Directory: `client`
- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Required environment variables:

- `VITE_API_URL=https://<railway-backend-domain>/api/v1`
- `VITE_SOCKET_URL=https://<railway-backend-domain>`

Notes:

- `client/vercel.json` is included for SPA route rewrites.
- This is required so React Router routes work on direct refresh and deep links.

## Railway backend deployment

Create or update the Railway backend service with these settings:

- Root Directory: `server`
- Install Command: `npm install`
- Build Command: `npm run build`
- Start Command: `npm run start`
- Healthcheck Path: `/health`

Required environment variables:

- `NODE_ENV=production`
- `PORT=4001`
- `CLIENT_URL=https://<vercel-frontend-domain>`
- `MONGODB_URI=<mongodb-atlas-uri>`
- `REDIS_URL=<redis-uri>`
- `QUEUE_DRIVER=bullmq`
- `FILE_STORAGE_DRIVER=local` or `s3`
- `UPLOAD_DIR=./uploads`
- `LOG_LEVEL=info`
- `ACCESS_TOKEN_TTL=15m`
- `REFRESH_TOKEN_TTL=7d`
- `JWT_PRIVATE_KEY=<rs256-private-key>`
- `JWT_PUBLIC_KEY=<rs256-public-key>`
- `COOKIE_SECRET=<strong-random-secret>`
- `SMTP_HOST=<smtp-host>`
- `SMTP_PORT=<smtp-port>`
- `SMTP_USER=<smtp-user>`
- `SMTP_PASS=<smtp-password>`
- `SMTP_FROM=noreply@metalabstech.com`
- `APP_NAME=NEXUS HRMS`
- `COMPANY_NAME=Meta Labs Tech`
- `COMPANY_WEBSITE=https://metalabstech.com`
- `COMPANY_PRIMARY_COLOR=#1A3C6E`

Important:

- Production must use explicit RSA keys for JWT. Do not rely on local fallback keys.
- If `FILE_STORAGE_DRIVER=local`, uploaded files stay on the Railway filesystem and are not durable across redeploys. Use S3-compatible storage for production persistence.

## GitHub push workflow

Recommended sequence:

1. review changes locally
2. stage files
3. commit with a release message
4. push to the deployment branch
5. let Vercel and Railway redeploy from GitHub

Suggested commands:

```bash
git add .
git commit -m "Finalize portal settings, avatar editor, employee project fixes, and gig apply flow"
git push origin main
```

## Production release checklist

Before pushing to production:

- confirm Railway backend env vars are set
- confirm Vercel frontend env vars are set
- confirm Railway service root directory is `server`
- confirm Vercel project root directory is `client`
- confirm MongoDB Atlas network access is open for Railway
- confirm Redis connection is valid if `QUEUE_DRIVER=bullmq`
- rotate demo seeded credentials before company-wide use
- replace local file storage with object storage if long-term upload retention is required
- verify login, avatar upload, project updates, gig apply, payroll view, and Settings after deploy

## Handover note for the company

The repository is structured as a monorepo:

- backend API and realtime server in `server/`
- frontend portal in `client/`

The codebase is currently in a verified buildable state and is ready for final GitHub push and platform redeploy, provided the production environment variables above are configured correctly.
