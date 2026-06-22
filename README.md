# NEXUS HRMS

A full-stack Human Resource Management System with role-based portals for Super Admin, HR,
Manager, Employee and Recruiter. Built as an npm workspaces monorepo.

Developed by Muhammad Raza Aslam and Sufyan for Meta Labs Tech.

## Project layout

```
.
├── frontend/   # React + Vite + Tailwind client
├── backend/    # Node + Express + Mongoose API
├── e2e/        # Playwright end-to-end tests
├── .github/    # CI/CD workflow
└── docker-compose.yml
```

## Tech stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Query, Zustand, Framer Motion
- **Backend:** Node.js, Express, TypeScript, MongoDB (Mongoose), Redis/BullMQ, Socket.IO, JWT
- **Testing:** Jest (unit/integration), Playwright (e2e)

## Getting started

```bash
# install all workspace dependencies
npm install

# start MongoDB + Redis locally
docker compose up -d mongo redis

# seed demo data
npm run seed

# run the API + web client together
npm run dev
```

The web client runs on `http://localhost:5173` and the API on `http://localhost:4001`.

## Useful scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run backend API and frontend together |
| `npm run build` | Build both workspaces |
| `npm run typecheck` | Type-check both workspaces |
| `npm test` | Run unit/integration tests |
| `npm run test:e2e` | Run Playwright e2e suite |
| `npm run seed` | Seed the database with demo data |

## Deployment

- **Frontend** deploys to Vercel (root directory: `frontend`).
- **Backend** deploys to Railway (root directory: `backend`).
