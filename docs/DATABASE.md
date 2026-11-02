# Database design

PostgreSQL. The schema is defined in [`src/server/db/schema.ts`](../src/server/db/schema.ts) and applied by the SQL migrations in [`drizzle/`](../drizzle).

## Entity-relationship diagram

```mermaid
erDiagram
  FACULTIES ||--o{ DEPARTMENTS : has
  DEPARTMENTS ||--o{ PROGRAMS : runs
  DEPARTMENTS ||--o{ COURSES : owns
  DEPARTMENTS ||--o{ USERS : "staff and students belong to"
  PROGRAMS ||--o{ PROGRAM_COURSES : includes
  COURSES ||--o{ PROGRAM_COURSES : "taken by"
  USERS ||--o| STUDENTS : "student profile"
  USERS ||--o| LECTURERS : "lecturer profile"
  PROGRAMS ||--o{ STUDENTS : enrols
  ACADEMIC_SESSIONS ||--|{ SEMESTERS : "has two"
  COURSES ||--o{ COURSE_OFFERINGS : "offered as"
  SEMESTERS ||--o{ COURSE_OFFERINGS : runs
  COURSE_OFFERINGS ||--o{ COURSE_ALLOCATIONS : "taught via"
  LECTURERS ||--o{ COURSE_ALLOCATIONS : teaches
  STUDENTS ||--o{ REGISTRATIONS : registers
  COURSE_OFFERINGS ||--o{ REGISTRATIONS : "registered in"
  COURSE_OFFERINGS ||--o| RESULT_SHEETS : "has one"
  RESULT_SHEETS ||--o{ RESULTS : contains
  REGISTRATIONS ||--o| RESULTS : "scored as"
  USERS ||--o{ AUTH_SESSIONS : "signed in as"
  USERS ||--o{ AUDIT_LOGS : performed

  USERS {
    uuid id PK
    text email "unique, case-insensitive"
    text password_hash
    user_role role
    account_status status
    uuid department_id FK "null only for super_admin"
  }
  STUDENTS {
    uuid user_id PK
    text matric_number "unique"
    uuid program_id FK
    smallint level "100-700"
  }
  COURSES {
    uuid id PK
    uuid department_id FK
    text code "unique"
    smallint units "1-6"
    smallint level
    semester_term term
    boolean is_active
  }
  COURSE_OFFERINGS {
    uuid id PK
    uuid course_id FK
    uuid semester_id FK "unique with course"
  }
  REGISTRATIONS {
    uuid id PK
    uuid student_id FK
    uuid offering_id FK "unique with student"
  }
  RESULT_SHEETS {
    uuid id PK
    uuid offering_id FK "unique"
    result_sheet_status status
    int version "optimistic lock"
    uuid submitted_by FK
    uuid reviewed_by FK
    text review_comment "required when rejected"
  }
  RESULTS {
    uuid registration_id PK
    uuid sheet_id FK
    numeric ca_score "0-30"
    numeric exam_score "0-70"
    text grade "snapshot"
    smallint grade_point
  }
  AUDIT_LOGS {
    bigint id PK
    uuid actor_id FK
    text action
    text entity_type
    text entity_id
    jsonb details
  }
```

## Key modelling decisions

- **Course vs offering.** A *course* (CSC 201, 3 units) is catalogue data. An *offering* is that course running in a specific semester. Registrations, lecturer allocations and result sheets hang off the offering, so history is preserved across sessions and "the same course twice in one semester" is a single unique index.
- **Programs ↔ courses is many-to-many** (`program_courses`). It decides which students can register a course, and whether the course is core or elective for them.
- **One user table, role profiles alongside.** `users` holds identity and role. `students` and `lecturers` hold role-specific data, keyed by the same id. A department admin who also teaches has both an admin role and a lecturer profile.
- **One result sheet per offering** carries the workflow state, a version for concurrency control, and who submitted and reviewed it. Individual `results` rows carry the scores.
- **Grades are stored, not recomputed.** Changing the grading scale never alters an approved result.
- **The audit log is append-only.** Rows can be inserted but never updated or deleted, enforced by a database trigger.

## Integrity constraints

| Rule | Enforced by |
|---|---|
| No duplicate course registration in a semester | `UNIQUE (student_id, offering_id)` |
| One result per registration | `results.registration_id` primary key |
| One sheet per course offering | `UNIQUE (offering_id)` on `result_sheets` |
| CA 0–30, exam 0–70 | `CHECK` constraints |
| Units 1–6, levels 100–700, program duration 1–7 years | `CHECK` constraints |
| Only one current semester | Partial unique index `WHERE is_current` |
| Each session has one first and one second semester | `UNIQUE (session_id, term)` |
| Session ends after it starts | `CHECK (ends_on > starts_on)` |
| Non-super-admins belong to a department | `CHECK (role = 'super_admin' OR department_id IS NOT NULL)` |
| A returned sheet has feedback | `CHECK (status <> 'rejected' OR review_comment IS NOT NULL)` |
| Unique emails, matric and staff numbers regardless of case | Unique indexes on `lower(email)`, `upper(matric_number)`, `upper(staff_number)` |
| Records in use cannot be deleted | Foreign keys with `ON DELETE RESTRICT` |
| Audit entries are permanent | `BEFORE UPDATE/DELETE` trigger raises an error |
| Every score change is traceable | `AFTER INSERT/UPDATE` trigger on `results` logs old and new scores |

## Indexes

Beyond primary keys and the unique constraints above:
- `registrations(offering_id)`: class lists;
- `results(sheet_id)`: score sheets;
- `result_sheets(status)`: approval queues;
- `course_allocations(lecturer_id)`: "my courses";
- `users(department_id)`, `students(program_id)`, `courses(department_id)`: department scoping;
- `audit_logs(entity_type, entity_id)`, `(actor_id)`, `(created_at)`: tracing and the activity log;
- `login_attempts(lower(email), created_at)`: brute-force lockout.
