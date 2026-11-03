# Security and permissions

## Authentication

- **Passwords:**
  - Hashed with PBKDF2-HMAC-SHA256 (a 16-byte random salt per password) through the native Web Crypto API, and compared in constant time.
  - **Work factor trade-off:** the demo runs on the Cloudflare Workers free plan, which allows about 10 ms of CPU per request. PBKDF2's cost grows with its iteration count, so the count is set to fit that budget (3,000).
  - Every hash records its own iteration count, and a user's hash is upgraded automatically on their next sign-in. On a paid plan, raising the constant to OWASP's 600,000 needs no migration.
  - New passwords need at least 10 characters, with a letter and a number. Length is preferred over complexity rules, following NIST SP 800-63B.
- **Sessions:**
  - A session is a random 256-bit token kept in a cookie with these settings:
    - `HttpOnly`, so scripts can't read it;
    - `Secure`, so it is only sent over HTTPS;
    - `SameSite=Lax`, which limits sending it from other sites;
    - `__Host-` prefix in production, which locks it to this exact site.
  - Only the token's SHA-256 digest is stored in the database, so a leaked database can't be used to log in.
  - Sessions last 12 hours.
- **Every request re-validates** the session against the database and the account status. Suspending, deactivating, resetting the password or changing the role deletes the user's sessions immediately.
- **Separate portals:** the Student, Staff and Admin portals each sign in only their own roles. The check runs after the password is verified, so it reveals nothing to someone guessing.
- **No account enumeration:** unknown emails and wrong passwords get the same message and take the same time (a dummy hash is verified when the email doesn't exist).
- **Brute-force protection:** after 5 failed attempts for an email, or 30 from one IP address, within 15 minutes, sign-in is refused for 15 minutes. Attempts are stored in the database, so the limit holds across all Worker instances.

## Authorization (RBAC with department scope)

Permissions are checked **on the server, in the service layer, against the record being accessed**, never against values taken on trust from the browser. Pages are protected too (wrong role → redirected; other department's record → 404), but the service check is the real boundary, so calling an action directly gains nothing.

| Capability | Student | Lecturer | Dept Admin | Super Admin |
|---|:-:|:-:|:-:|:-:|
| View own profile, update contact details | ✅ | | | |
| Register / drop own courses (while registration is open) | ✅ | | | |
| View own **approved** results, GPA, CGPA; print slip and statement | ✅ | | | |
| View class lists of **assigned** courses | | ✅ | ✅ own dept | ✅ |
| Enter scores, save drafts, submit (**assigned** courses, editable states only) | | ✅ | | |
| Approve / return / reopen results | | | ✅ own dept, not own submission | view only |
| Create students, lecturers, programs, courses in department | | | ✅ own dept | ✅ |
| Offer courses, assign lecturers | | | ✅ own dept | ✅ |
| Reset passwords | | | ✅ own students and lecturers | ✅ |
| Faculties, departments, sessions, semesters, registration window | | | | ✅ |
| Activate / suspend / deactivate accounts, change staff roles | | | | ✅ (not self) |
| University-wide reports and activity log | | | | ✅ |

Approval decisions belong to department admins, as the brief describes ("only authorized departmental administrators can approve results for their department"). The super admin oversees approvals and can see every sheet but does not approve on a department's behalf.

## Input handling

- **Validation:** every Server Action input is parsed by a Zod schema (types, lengths, formats, enums). The database repeats the critical rules as constraints.
- **SQL:** all queries go through Drizzle's parameterised query builder; no SQL is built from strings with user input. Search terms escape `%` and `_`.
- **Output:** React escapes everything it renders, and no HTML is injected anywhere.

## Transport and browser hardening

The following response headers are set on every page:

| Header | Effect |
|---|---|
| `Strict-Transport-Security` | Browsers always use HTTPS |
| `X-Frame-Options: DENY` | Pages can't be framed (prevents clickjacking) |
| `X-Content-Type-Options: nosniff` | Browsers don't guess file types |
| `Referrer-Policy` | Limits what is sent to other sites in the referrer |
| `Permissions-Policy` | Camera, microphone, location and payment features are turned off |

- **CSRF:** Server Actions only accept same-origin POSTs (Next.js checks Origin against Host).
- **Indexing:** pages are marked `noindex`.

## Audit trail

Logged actions:
- sign-ins and sign-outs;
- account creation, status changes, role changes and password resets;
- every structure change;
- registrations and drops;
- draft saves, submissions, approvals, rejections and reopens.

Every individual score insertion or change is also logged by a database trigger, with the old and new values.

The `audit_logs` table is **append-only at the database level**: a trigger rejects any `UPDATE` or `DELETE`. Audit entries are written in the same transaction as the change they describe, so there is never a change without its record, or a record without its change.

## Errors and secrets

- **Errors:** users see a safe message. Unexpected errors show only a reference digest, and stack traces stay in server logs.
- **Secrets:** they live in Cloudflare (Hyperdrive configuration and Worker secrets). `.env*` files are git-ignored, and the repository contains no credentials apart from the documented demo password for the seeded test accounts.
