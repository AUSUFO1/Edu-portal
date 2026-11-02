# University Education Management Portal

A web portal for running a university's academic records: students register courses, lecturers enter and submit scores, departments approve results, and the registry manages the whole institution. Four roles, each with its own dashboard and strictly enforced permissions.

**Stack:** Next.js 16 (App Router, Server Actions) · TypeScript · PostgreSQL · Drizzle ORM · Zod · Tailwind CSS 4 · deployed on Cloudflare Workers with Hyperdrive.

| | |
|---|---|
| Live application | _added on deployment_ |
| Architecture & design | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Database design & ER diagram | [docs/DATABASE.md](docs/DATABASE.md) |
| Security & permissions | [docs/SECURITY.md](docs/SECURITY.md) |
| Deployment | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |

## Test accounts

There are three sign-in portals, each accepting only its own roles:

| Portal | URL | Who |
|---|---|---|
| Student Portal | `/login/student` | Students |
| Staff Portal | `/login/staff` | Lecturers and department admins |
| Admin Portal | `/login/admin` | Super admins (registry) |

All demo accounts use the password **`Portal@2026`**. The university name is set with `NEXT_PUBLIC_UNIVERSITY_NAME` (default: Crestfield University, a fictional name).

| Role | Email | What to try |
|---|---|---|
| Super Admin | `registrar@uemp.edu.ng` | University dashboard, faculties, sessions, users, activity log |
| Department Admin (Computer Science) | `hod.csc@uemp.edu.ng` | Approve **CSC 201** (awaiting approval), manage courses and lecturers |
| Department Admin (Computer Science) | `exams.csc@uemp.edu.ng` | Second admin of the same department |
| Department Admin (Mathematics) | `hod.mth@uemp.edu.ng` | Cannot see or act on Computer Science records |
| Lecturer | `chioma.nwosu@uemp.edu.ng` | **CSC 203** was returned for correction: fix and resubmit |
| Lecturer | `yakubu.sani@uemp.edu.ng` | **CSC 205** is a draft: enter the remaining scores and submit |
| Lecturer | `adebayo.ola@uemp.edu.ng` | **CSC 201** is awaiting approval (locked) |
| Student (200 level, registered) | `aisha.mohammed@student.uemp.edu.ng` | Results and CGPA from last session, registration slip |
| Student (200 level, not registered) | `blessing.etim@student.uemp.edu.ng` | Register this semester's courses |
| Student (carry-over) | `kelechi.uche@student.uemp.edu.ng` | Failed CSC 103 last session; it appears as a carry-over |
| Student (100 level) | `samuel.danjuma@student.uemp.edu.ng` | First registration as a fresher |

The demo data covers a completed session (2025/2026, all results approved) and the current one (2026/2027 first semester, registration open), with result sheets in every state of the approval workflow.

## The workflows end to end

1. **Course registration.** Sign in as `blessing.etim@…`, open *Course registration*, select courses (the unit counter enforces the 24-unit maximum) and register. Sign in as `hod.csc@…` → *Registrations* to see her on the class lists.
2. **Result submission.** Sign in as `yakubu.sani@…`, open **CSC 205**, enter CA (/30) and exam (/70) scores. Totals and grades calculate as you type. *Save draft*, then *Submit for approval*: the sheet locks.
3. **Departmental approval.** Sign in as `hod.csc@…` → *Result approvals* → **CSC 205** → approve, or return it with a comment.
4. **Students see approved results only.** Sign in as a student in that class → *Results*: GPA per semester and CGPA update.
5. **Super admin.** Sign in as `registrar@…`: create a faculty, department, session; open or close registration; suspend a user (they are signed out immediately); read the activity log.

## Running locally

Requirements: Node.js 20+. No database installation is needed: locally the app uses [PGlite](https://pglite.dev), a full PostgreSQL engine compiled to WebAssembly, stored in `./.pglite`.

```bash
npm install
npm run db:reset     # create the schema and load the demo data
npm run dev          # http://localhost:3000
```

To use a real PostgreSQL server instead (for example Neon), put its connection string in `.env` as `DATABASE_URL` and run the same commands.

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm test` | Unit and integration tests (in-memory PostgreSQL) |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Load demo data into an empty database |
| `npm run db:reset` | Drop everything, migrate and seed (refuses to run in production) |
| `npm run cf:preview` / `npm run cf:deploy` | Build for Cloudflare Workers and preview or deploy |

> Stop `npm run dev` before running database scripts against the local PGlite database: it allows one process at a time.

## Project structure

```
src/
  domain/            Pure business rules: grading, GPA, result workflow, unit limits (no I/O)
  server/
    db/              Schema (tables, constraints, indexes) and the connection factory
    auth/            Password hashing, sessions, role and department policies
    services/        Use cases: registration, results, structure, users, reports, audit
    actions/         Server Actions: validate input → check role → call a service
  lib/               Validation schemas (Zod) and formatting helpers
  components/        Design system, app shell, admin views
  app/               Routes, one folder per role: student, lecturer, department, admin
drizzle/             SQL migrations (including the audit triggers)
scripts/             Migrate, seed and reset
tests/               Domain unit tests and workflow/permission integration tests
docs/                Architecture, database, security and deployment documentation
```

## Tests

```bash
npm test
```

39 tests. The integration tests run every workflow against a real PostgreSQL engine (in memory), including:
- concurrent double submissions;
- stale-version conflicts;
- cross-department access attempts;
- lockout after repeated failed sign-ins;
- immediate sign-out of suspended users;
- the database refusing edits to the audit log.
