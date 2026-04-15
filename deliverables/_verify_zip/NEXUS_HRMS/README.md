# NEXUS HRMS

NEXUS HRMS is a production-oriented MERN monorepo for Meta Labs Tech, built around people operations for a software house with Pakistan and UAE workflows. The repo includes:

- `server/`: Express + TypeScript API with JWT auth, RBAC, Mongoose modules, BullMQ-ready jobs, PDF/Excel exports, and Socket.IO support.
- `client/`: React 18 + Vite + TypeScript SPA with Tailwind styling, Zustand state, TanStack Query, React Hook Form + Zod, charts, and an authenticated admin shell.

## Implemented modules

- Auth: register, login, refresh, logout, MFA setup and verification.
- Employees: CRUD, generated employee IDs, uploads, bulk import, timeline.
- Departments: CRUD and org-chart snapshot.
- Attendance: check-in/out, shifts, overtime requests, monthly reports, live dashboard data.
- Leave: policies, balances, apply flow, multi-stage approvals, analytics, calendar feed.
- Payroll: monthly processing, tax calculation, provident fund, loan/advance support, payslip PDF, bank export.
- Projects: role-based project workspaces, team assignment, department views, and employee status updates.
- Performance: review cycles, OKRs, KPIs, feedback, bell-curve dashboard, PIPs.
- Recruitment: job posts, public careers feed, applications, ATS stage updates, interviews, offers, onboarding.
- Analytics: KPI dashboard, chart payloads, report builder, natural-language query parser.
- Notifications: in-app notification center and preference storage.
- Pulse: surveys, sentiment scoring, recognition feed.
- Gigs: internal marketplace CRUD and applications.
- Announcements: publish, manage, read receipts, Socket.IO broadcasts.
- Access control: role-based portals, generated temporary passwords, password reset, and Super Admin authority transfer.

## Tech stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, React Router v6, Recharts, Framer Motion, Socket.IO client, React Hook Form, Zod.
- Backend: Node.js, Express, TypeScript, Mongoose, Socket.IO, BullMQ, Redis, Nodemailer, Multer, Sharp, PDFKit, ExcelJS, bcryptjs, jsonwebtoken, Winston, Morgan, Helmet, CORS, express-rate-limit.
- Database: MongoDB.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment files:

```bash
copy server\\.env.example server\\.env
copy client\\.env.example client\\.env
```

3. Start MongoDB and Redis locally, or use Docker Compose:

```bash
docker-compose up --build
```

4. Seed the database:

```bash
npm run seed
```

5. Run the application from the required server workspace command:

```bash
cd server
npm run dev
```

This starts the API and the Vite client together.

Local development defaults to API port `4001` so it does not collide with common Docker/WSL services already using `4000`. If you want a different port, set `PORT`, `VITE_API_URL`, and `VITE_SOCKET_URL` explicitly.

## Default seeded credentials

- Super Admin / CEO: `zia.aslam@metalabstech.com` / `Meta@12345`
- HR Portal: `hr.portal@metalabstech.com` / `Meta@12345`
- Manager Portal: `manager.portal@metalabstech.com` / `Meta@12345`
- Employee Portal: `employee.portal@metalabstech.com` / `Meta@12345`
- Recruiter Portal: `recruiter.portal@metalabstech.com` / `Meta@12345`

## Verification commands

```bash
npm run typecheck
npm run test
npm run build
```

## Deployment notes

- Client target: Vercel.
- API and worker target: Railway.
- Database target: MongoDB Atlas.
- Cache/queue target: Redis Cloud.
- The GitHub Actions workflow runs typecheck, tests, and builds on each push or pull request.
- Company handover document: [COMPANY_HANDOVER.md](./COMPANY_HANDOVER.md)

## Storage and queue defaults

- File storage defaults to local disk under `server/uploads`.
- Background jobs default to inline execution in development with `QUEUE_DRIVER=inline`.
- Switch to `QUEUE_DRIVER=bullmq` with Redis enabled for production-style queue processing.

## Security defaults

- RS256 JWT access and refresh tokens.
- Refresh token rotation via `AuthSession`.
- Rate limiting: 100 requests per minute globally, 5 per minute for auth routes.
- Helmet, CORS, cookie security, Mongo sanitize, upload validation, audit logging.

## Notes

- The client build currently emits a large-chunk warning because the first pass intentionally favors feature completeness over route-level code splitting.
- The project is ready for the next hardening pass around provider integrations, chunk splitting, and broader endpoint-level automated test coverage.
