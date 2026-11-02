CREATE TYPE "public"."account_status" AS ENUM('active', 'suspended', 'deactivated');--> statement-breakpoint
CREATE TYPE "public"."result_sheet_status" AS ENUM('draft', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."semester_term" AS ENUM('first', 'second');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'lecturer', 'department_admin', 'super_admin');--> statement-breakpoint
CREATE TABLE "academic_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_sessions_name_unique" UNIQUE("name"),
	CONSTRAINT "academic_sessions_dates_check" CHECK ("academic_sessions"."ends_on" > "academic_sessions"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_allocations" (
	"offering_id" uuid NOT NULL,
	"lecturer_id" uuid NOT NULL,
	"assigned_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_allocations_offering_id_lecturer_id_pk" PRIMARY KEY("offering_id","lecturer_id")
);
--> statement-breakpoint
CREATE TABLE "course_offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"semester_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"units" smallint NOT NULL,
	"level" smallint NOT NULL,
	"term" "semester_term" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_units_check" CHECK ("courses"."units" between 1 and 6),
	CONSTRAINT "courses_level_check" CHECK ("courses"."level" in (100, 200, 300, 400, 500, 600, 700))
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"faculty_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "faculties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faculties_code_unique" UNIQUE("code"),
	CONSTRAINT "faculties_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "grade_scale" (
	"grade" text PRIMARY KEY NOT NULL,
	"min_score" smallint NOT NULL,
	"max_score" smallint NOT NULL,
	"point" smallint NOT NULL,
	CONSTRAINT "grade_scale_range_check" CHECK ("grade_scale"."min_score" >= 0 and "grade_scale"."max_score" <= 100 and "grade_scale"."min_score" <= "grade_scale"."max_score"),
	CONSTRAINT "grade_scale_point_check" CHECK ("grade_scale"."point" between 0 and 5)
);
--> statement-breakpoint
CREATE TABLE "lecturers" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"staff_number" text NOT NULL,
	"title" text NOT NULL,
	"rank" text NOT NULL,
	"phone" text
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"ip_address" "inet",
	"succeeded" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_courses" (
	"program_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"is_core" boolean DEFAULT true NOT NULL,
	CONSTRAINT "program_courses_program_id_course_id_pk" PRIMARY KEY("program_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"award" text NOT NULL,
	"duration_years" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "programs_code_unique" UNIQUE("code"),
	CONSTRAINT "programs_duration_check" CHECK ("programs"."duration_years" between 1 and 7)
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"offering_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "result_sheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offering_id" uuid NOT NULL,
	"status" "result_sheet_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"submitted_by" uuid,
	"submitted_at" timestamp with time zone,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "result_sheets_offering_id_unique" UNIQUE("offering_id"),
	CONSTRAINT "result_sheets_rejection_comment_check" CHECK ("result_sheets"."status" <> 'rejected' or "result_sheets"."review_comment" is not null)
);
--> statement-breakpoint
CREATE TABLE "results" (
	"registration_id" uuid PRIMARY KEY NOT NULL,
	"sheet_id" uuid NOT NULL,
	"ca_score" numeric(5, 2) NOT NULL,
	"exam_score" numeric(5, 2) NOT NULL,
	"grade" text NOT NULL,
	"grade_point" smallint NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "results_ca_check" CHECK ("results"."ca_score" between 0 and 30),
	CONSTRAINT "results_exam_check" CHECK ("results"."exam_score" between 0 and 70)
);
--> statement-breakpoint
CREATE TABLE "semesters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"term" "semester_term" NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"registration_open" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"matric_number" text NOT NULL,
	"program_id" uuid NOT NULL,
	"level" smallint NOT NULL,
	"entry_year" smallint NOT NULL,
	"phone" text,
	"address" text,
	CONSTRAINT "students_level_check" CHECK ("students"."level" in (100, 200, 300, 400, 500, 600, 700))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"department_id" uuid,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_department_check" CHECK ("users"."role" = 'super_admin' or "users"."department_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_allocations" ADD CONSTRAINT "course_allocations_offering_id_course_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."course_offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_allocations" ADD CONSTRAINT "course_allocations_lecturer_id_lecturers_user_id_fk" FOREIGN KEY ("lecturer_id") REFERENCES "public"."lecturers"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_allocations" ADD CONSTRAINT "course_allocations_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecturers" ADD CONSTRAINT "lecturers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_courses" ADD CONSTRAINT "program_courses_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_courses" ADD CONSTRAINT "program_courses_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_student_id_students_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_offering_id_course_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."course_offerings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_sheets" ADD CONSTRAINT "result_sheets_offering_id_course_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."course_offerings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_sheets" ADD CONSTRAINT "result_sheets_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_sheets" ADD CONSTRAINT "result_sheets_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_sheet_id_result_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."result_sheets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_session_id_academic_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "course_allocations_lecturer_idx" ON "course_allocations" USING btree ("lecturer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_offerings_course_semester_key" ON "course_offerings" USING btree ("course_id","semester_id");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_code_key" ON "courses" USING btree (upper("code"));--> statement-breakpoint
CREATE INDEX "courses_department_idx" ON "courses" USING btree ("department_id");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_faculty_name_key" ON "departments" USING btree ("faculty_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "lecturers_staff_number_key" ON "lecturers" USING btree (upper("staff_number"));--> statement-breakpoint
CREATE INDEX "login_attempts_email_time_idx" ON "login_attempts" USING btree (lower("email"),"created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "registrations_student_offering_key" ON "registrations" USING btree ("student_id","offering_id");--> statement-breakpoint
CREATE INDEX "registrations_offering_idx" ON "registrations" USING btree ("offering_id");--> statement-breakpoint
CREATE INDEX "result_sheets_status_idx" ON "result_sheets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "results_sheet_idx" ON "results" USING btree ("sheet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "semesters_session_term_key" ON "semesters" USING btree ("session_id","term");--> statement-breakpoint
CREATE UNIQUE INDEX "semesters_single_current_key" ON "semesters" USING btree ("is_current") WHERE "semesters"."is_current";--> statement-breakpoint
CREATE UNIQUE INDEX "students_matric_number_key" ON "students" USING btree (upper("matric_number"));--> statement-breakpoint
CREATE INDEX "students_program_idx" ON "students" USING btree ("program_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "users_department_idx" ON "users" USING btree ("department_id");