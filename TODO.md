# Job-Board — Project Progress & Production Readiness Checklist

> Last updated: Aug 06, 2026
>
> Stack: Express 5 + TypeScript, Drizzle ORM + PostgreSQL, Better-Auth, Zod, Winston logging

## Status Overview

| Area | Status |
|------|--------|
| Backend API (jobs, applications) | ✅ Functional (dev quality) |
| Auth (better-auth, email/password) | ⚠️ Working, but not production-safe (no emails, hardcoded URLs) |
| Logging | ✅ Good (winston, rotation, redaction) |
| Validation (zod) | ⚠️ Middleware exists, but controllers don't use validated data |
| Tests | ❌ None |
| CI / CD / Deployment | ❌ None |

---

## ✅ Done

### Setup & Infra
- [x] Express 5 + TypeScript (strict) + tsx dev runner + tsc build (`dist/`)
- [x] PostgreSQL via `pg` pool + Drizzle ORM (`src/db/index.ts`)
- [x] Path alias `@/*` with `tsc-alias`
- [x] pnpm workspace config, ESLint, Prettier configs
- [x] `.env` handling via dotenv (DB URL, PORT, NODE_ENV)
- [x] Drizzle migrations generated (0000, 0001) + `drizzle.config.ts`

### Database schema (`src/db/schemas/`)
- [x] Auth tables: `user`, `session`, `account`, `verification` (better-auth, drizzle adapter)
- [x] `user` table with custom fields: `role` (admin/employer/seeker), `profile`, `location`
- [x] `jobs` table (title, description, employerId FK, salaryMin/Max, location, status enum, createdAt)
- [x] `applications` table (jobId FK, seekerId FK, status enum, coverLetter, cv, appliedAt, unique job+seeker)
- [x] `skills`, `user_skills`, `job_skills` tables (M2M)
- [x] Drizzle relations + cascade deletes

### Auth
- [x] Better-Auth integrated with drizzle adapter (`src/utils/auth.ts`)
- [x] Email/password sign-in/sign-up endpoints via `/api/auth/*`
- [x] Custom `role` additional field (defaults to `seeker`)
- [x] Auth middleware (`src/middlewares/authMiddleware.ts`)
- [x] Role guard middleware (`src/middlewares/roles.ts` — `requireRole`) — **not yet wired into routes**

### Jobs API (`/api/jobs`)
- [x] GET / (list, `mine=true` filter, page/limit pagination, skills included)
- [x] GET /:id (with skills)
- [x] POST / (employer only, creates job + skills via upsert)
- [x] PATCH /:id (employer-owner only)
- [x] DELETE /:id (employer-owner only)
- [x] POST /:id/apply (seeker only)
- [x] GET /:id/applications (owner-employer only, includes seeker info + aggregated skills)
- [x] Zod validation middleware on all job routes (`src/utils/zod-schemas.ts`)

### Applications API (`/api/applications`)
- [x] GET / (role-aware listing with pagination)
- [x] GET /:id
- [x] POST /:id/status (employer-owner only, validates status enum)
- [x] DELETE /:id
- [x] Role-based access checks (seeker sees own, employer sees own jobs' apps)

### Logging & Error Handling
- [x] Winston logger with daily rotating files (`logs/rotating-logs-%DATE%.log`, 14-day retention, 20MB cap)
- [x] Response interceptor middleware logging requests/responses
- [x] Sensitive key redaction (password fields) in logs
- [x] Central error handler middleware

### Misc
- [x] Bruno API documentation (`job-board-documentation.html`)
- [x] `.gitignore` (node_modules, dist, logs, .env)

---

## ⚠️ Known Gaps / In-Progress (from code comments & review)

- [x] `src/controllers/jobs-controller.ts:7` — GET /jobs should return employer data (name/company) instead of just `employerId`
- [x] `src/controllers/applications-controller.ts:16` — GET applications should show a brief of the job instead of `jobId` (same for the other GET methods)
- [ ] `src/utils/auth.ts` — `sendEmail()` is **referenced but never defined** (commented import). `onExistingUserSignUp` / `sendResetPassword` will throw at runtime → block or implement email sending
- [ ] Email verification disabled (`requireEmailVerification: false`, commented out) — a seeker/employer can sign up with a fake email today

---

## ☐ TODO — Production Readiness Checklist

### 1. Security (High Priority)
- [ ] Install & configure `helmet` (security headers)
- [ ] Fix CORS: `origin: "*"` + `credentials: true` is invalid in browsers → configurable allow-list via env (`CORS_ORIGINS`)
- [ ] Add rate limiting (e.g. `express-rate-limit`) on `/api/auth/*` and apply endpoints
- [ ] Remove the debug `console.log("Auth route hit")` in `src/app.ts`
- [ ] Stop logging raw request headers (they contain auth cookies/tokens) in `src/utils/logger.ts` — only log safe headers
- [ ] Redact tokens/cookies (`access_token`, `refresh_token`, `Authorization`) in log redaction
- [ ] Validate/limit request body size (JSON body limit)
- [ ] Run `npm audit` and keep dependencies updated
- [ ] Remove `nodemon` from production dependencies

### 2. Auth & User Management
- [ ] Implement `sendEmail` service (SMTP via e.g. Resend/SES/Nodemailer) and re-enable email verification
- [ ] Move `baseURL`, `trustedOrigins`, and cookie settings to env config (currently hardcoded to `localhost:3000`)
- [ ] `user.role` is `input: true` — **users can set `role: "employer"` on signup**; restrict role setting (server-side enforcement or admin-only upgrade)
- [ ] Wire `requireRole` middleware into routes (or keep controller checks but centralize)
- [ ] Add admin-only user management endpoints (list/ban/promote users) — `admin` role exists but nothing uses it
- [ ] Add password change endpoint, session revocation (logout-all) if needed
- [ ] Enforce secure cookies over HTTPS in production

### 3. Data & DB
- [ ] Use `req.validated` in controllers (zod middleware validates but controllers re-read `req.body`/`req.query` raw → type safety lost, `NaN` possible in `parseInt`)
- [x] Fix N+1 query in `getJobs` (skills fetched per job in a loop) → use `json_agg` like `getJobApplications` does
- [ ] Add zod validation for application routes (status, coverLetter, cv, params) — currently unvalidated; e.g. a seeker can set `status: "hired"` on apply
- [ ] Add migration workflow for production: `drizzle-kit migrate` (current `db:migrate` uses `push` which is dev-only)
- [ ] Add a seed script (test employers/seekers/jobs)
- [ ] Add DB indexes on `applications.jobId` and `jobs.employerId` for join queries
- [ ] Validate env vars at startup (zod) and fail fast

### 4. API Quality
- [ ] Consistent response envelope (success/error) across all endpoints
- [ ] Remove duplicate body parsers in `src/app.ts` (`express.urlencoded` + `bodyParser` used twice)
- [ ] Handle `NaN`/invalid pagination defensively (clamp page/limit)
- [ ] `createApplication` should verify the job exists and is `open`
- [ ] 404 handling for unknown routes (final catch-all)
- [ ] `GET /health` endpoint with DB connectivity check (for load balancers / orchestrators)

### 5. Testing
- [ ] Unit tests for controllers/middleware (e.g. vitest + supertest)
- [ ] Integration/API tests for jobs + applications + auth flows
- [ ] Test coverage on role-based access rules
- [ ] CI test step (see below)

### 6. CI / CD / Deployment
- [ ] GitHub Actions (or similar): lint → typecheck → tests → build on PR
- [ ] Dockerfile + docker-compose (app + postgres) or managed DB
- [ ] Production build verified: `pnpm build && node dist/index.js` actually runs (untested so far)
- [ ] Deploy target (Railway/Render/Fly/VPS) with HTTPS
- [ ] Environment secrets management (DATABASE_URL, SESSION secrets, SMTP creds)
- [ ] Graceful shutdown (SIGTERM/SIGINT → close DB pool, stop accepting requests)

### 7. Monitoring & Observability
- [ ] Structured request IDs / trace ID propagation in logs
- [ ] Error reporting service (Sentry) for production errors
- [ ] Basic health/readiness endpoints
- [ ] Log rotation verified in prod (winston daily rotate config)

### 8. Documentation
- [ ] Fill in `README.md` (setup, env vars, scripts, API overview)
- [ ] Document auth flows (signup/login, role assignment)
- [ ] Keep Bruno collection in sync

---

### Suggested next steps (in order)
1. Fix `role` being user-settable + wire `requireRole` (security)
2. Implement `sendEmail` or stub it safely; env-config `baseURL`/origins
3. Make controllers consume `req.validated`; add zod validation to applications routes
4. Add tests + CI
5. Dockerize + deploy
