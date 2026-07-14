-- ============================================================================
-- PRECE3000 - Migración unificada para Neon
-- Ejecutar completo en el SQL Editor de Neon
-- ============================================================================

-- ── BETTER AUTH TABLES ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "image" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY,
  "expiresAt" timestamp NOT NULL,
  "token" text NOT NULL UNIQUE,
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamp,
  "refreshTokenExpiresAt" timestamp,
  "scope" text,
  "password" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- ── ENUMS ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'school_admin', 'director', 'preceptor', 'secretary', 'teacher');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'absent_justified', 'late', 'early_withdrawal');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."book_entry_type" AS ENUM('incident', 'sanction', 'warning', 'phone_call', 'interview', 'meeting', 'observation', 'conduct_followup');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."communication_type" AS ENUM('whatsapp', 'email');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."document_type" AS ENUM('medical_certificate', 'authorization', 'dni', 'receipt', 'school_insurance', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."event_type" AS ENUM('act', 'institutional', 'holiday', 'exam', 'meeting', 'report_delivery');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."alert_type" AS ENUM('excessive_absences', 'near_failing', 'missing_documentation', 'incomplete_data', 'birthday', 'pending_communication');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── TABLAS DE LA APLICACIÓN ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "schools" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "address" text,
  "phone" text,
  "email" text,
  "logo_url" text,
  "active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "profiles" (
  "id" uuid PRIMARY KEY NOT NULL,
  "school_id" uuid,
  "role" "user_role" NOT NULL,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "avatar_url" text,
  "deactivated_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "academic_years" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "name" text NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "active" boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS "courses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "name" text NOT NULL,
  "academic_year_id" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "divisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "name" text NOT NULL,
  "shift" text,
  "academic_year_id" uuid NOT NULL,
  "preceptor_id" uuid
);

CREATE TABLE IF NOT EXISTS "subjects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "name" text NOT NULL,
  "academic_year_id" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "students" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "division_id" uuid,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "dni" text NOT NULL UNIQUE,
  "birth_date" date,
  "gender" text,
  "nationality" text,
  "address" text,
  "phone" text,
  "email" text,
  "photo_url" text,
  "blood_type" text,
  "health_insurance" text,
  "health_affiliate_number" text,
  "doctor_name" text,
  "doctor_phone" text,
  "allergies" text,
  "medication" text,
  "restrictions" text,
  "observations" text,
  "status" text DEFAULT 'active',
  "academic_year_id" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "student_guardians" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL,
  "name" text NOT NULL,
  "phone" text,
  "email" text,
  "relationship" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "authorized_persons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL,
  "name" text NOT NULL,
  "phone" text,
  "document" text
);

CREATE TABLE IF NOT EXISTS "attendance" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "division_id" uuid NOT NULL,
  "date" date NOT NULL,
  "status" "attendance_status" NOT NULL,
  "observation" text,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "attendance_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "attendance_id" uuid NOT NULL,
  "previous_status" "attendance_status",
  "new_status" "attendance_status" NOT NULL,
  "changed_by" uuid NOT NULL,
  "changed_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "preceptor_book" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "type" "book_entry_type" NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "student_id" uuid,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "communications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "type" "communication_type" NOT NULL,
  "message" text NOT NULL,
  "sent_to" text NOT NULL,
  "sent_at" timestamp with time zone DEFAULT now() NOT NULL,
  "status" text DEFAULT 'sent'
);

CREATE TABLE IF NOT EXISTS "documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "name" text NOT NULL,
  "type" "document_type" NOT NULL,
  "file_url" text NOT NULL,
  "uploaded_by" uuid NOT NULL,
  "uploaded_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "calendar_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "start_date" timestamp with time zone NOT NULL,
  "end_date" timestamp with time zone,
  "type" "event_type" NOT NULL,
  "all_day" boolean DEFAULT false,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "withdrawals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "withdrawn_by" text NOT NULL,
  "document" text,
  "observations" text,
  "signature" text,
  "date" date NOT NULL,
  "time" time NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid,
  "user_id" uuid NOT NULL,
  "action" text NOT NULL,
  "table_name" text NOT NULL,
  "record_id" text,
  "old_values" jsonb,
  "new_values" jsonb,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "alerts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "student_id" uuid,
  "type" "alert_type" NOT NULL,
  "message" text NOT NULL,
  "read" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "appointments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "start_date" timestamp with time zone NOT NULL,
  "end_date" timestamp with time zone,
  "type" text NOT NULL,
  "completed" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "teacher_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "teacher_id" uuid NOT NULL,
  "division_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "academic_year_id" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "preceptor_schools" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "preceptor_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  UNIQUE("preceptor_id", "school_id")
);

CREATE TABLE IF NOT EXISTS "teacher_schools" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "teacher_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "deactivated_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  UNIQUE("teacher_id", "school_id")
);

CREATE TABLE IF NOT EXISTS "employee_attendance" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "date" date NOT NULL,
  "status" text NOT NULL,
  "observation" text,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "employee_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "day_of_week" integer NOT NULL,
  "time_start" text NOT NULL,
  "time_end" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "division_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "division_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "teacher_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "day_of_week" integer NOT NULL,
  "time_start" text NOT NULL,
  "time_end" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "grades" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "division_id" uuid NOT NULL,
  "academic_year_id" uuid NOT NULL,
  "partial_1" text,
  "final_1" integer,
  "partial_2" text,
  "final_2" integer,
  "updated_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now(),
  "created_at" timestamp with time zone DEFAULT now(),
  UNIQUE("student_id", "subject_id", "division_id", "academic_year_id")
);

-- ── FOREIGN KEYS ──────────────────────────────────────────────────────────────

ALTER TABLE "profiles" ADD CONSTRAINT IF NOT EXISTS "profiles_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE set null;

ALTER TABLE "academic_years" ADD CONSTRAINT IF NOT EXISTS "academic_years_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;

ALTER TABLE "courses" ADD CONSTRAINT IF NOT EXISTS "courses_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;
ALTER TABLE "courses" ADD CONSTRAINT IF NOT EXISTS "courses_academic_year_id_academic_years_id_fk"
  FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE cascade;

ALTER TABLE "divisions" ADD CONSTRAINT IF NOT EXISTS "divisions_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;
ALTER TABLE "divisions" ADD CONSTRAINT IF NOT EXISTS "divisions_course_id_courses_id_fk"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE cascade;
ALTER TABLE "divisions" ADD CONSTRAINT IF NOT EXISTS "divisions_academic_year_id_academic_years_id_fk"
  FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE cascade;

ALTER TABLE "subjects" ADD CONSTRAINT IF NOT EXISTS "subjects_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;
ALTER TABLE "subjects" ADD CONSTRAINT IF NOT EXISTS "subjects_academic_year_id_academic_years_id_fk"
  FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE cascade;

ALTER TABLE "students" ADD CONSTRAINT IF NOT EXISTS "students_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;
ALTER TABLE "students" ADD CONSTRAINT IF NOT EXISTS "students_division_id_divisions_id_fk"
  FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE set null;
ALTER TABLE "students" ADD CONSTRAINT IF NOT EXISTS "students_academic_year_id_academic_years_id_fk"
  FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE set null;

ALTER TABLE "student_guardians" ADD CONSTRAINT IF NOT EXISTS "student_guardians_student_id_students_id_fk"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE cascade;

ALTER TABLE "authorized_persons" ADD CONSTRAINT IF NOT EXISTS "authorized_persons_student_id_students_id_fk"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE cascade;

ALTER TABLE "attendance" ADD CONSTRAINT IF NOT EXISTS "attendance_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;
ALTER TABLE "attendance" ADD CONSTRAINT IF NOT EXISTS "attendance_student_id_students_id_fk"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE cascade;
ALTER TABLE "attendance" ADD CONSTRAINT IF NOT EXISTS "attendance_division_id_divisions_id_fk"
  FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE cascade;
ALTER TABLE "attendance" ADD CONSTRAINT IF NOT EXISTS "attendance_created_by_profiles_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE set null;

ALTER TABLE "attendance_log" ADD CONSTRAINT IF NOT EXISTS "attendance_log_attendance_id_attendance_id_fk"
  FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE cascade;
ALTER TABLE "attendance_log" ADD CONSTRAINT IF NOT EXISTS "attendance_log_changed_by_profiles_id_fk"
  FOREIGN KEY ("changed_by") REFERENCES "profiles"("id") ON DELETE set null;

ALTER TABLE "preceptor_book" ADD CONSTRAINT IF NOT EXISTS "preceptor_book_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;
ALTER TABLE "preceptor_book" ADD CONSTRAINT IF NOT EXISTS "preceptor_book_student_id_students_id_fk"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE set null;
ALTER TABLE "preceptor_book" ADD CONSTRAINT IF NOT EXISTS "preceptor_book_created_by_profiles_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE set null;

ALTER TABLE "communications" ADD CONSTRAINT IF NOT EXISTS "communications_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;
ALTER TABLE "communications" ADD CONSTRAINT IF NOT EXISTS "communications_student_id_students_id_fk"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE cascade;

ALTER TABLE "documents" ADD CONSTRAINT IF NOT EXISTS "documents_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;
ALTER TABLE "documents" ADD CONSTRAINT IF NOT EXISTS "documents_student_id_students_id_fk"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE cascade;
ALTER TABLE "documents" ADD CONSTRAINT IF NOT EXISTS "documents_uploaded_by_profiles_id_fk"
  FOREIGN KEY ("uploaded_by") REFERENCES "profiles"("id") ON DELETE set null;

ALTER TABLE "calendar_events" ADD CONSTRAINT IF NOT EXISTS "calendar_events_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;
ALTER TABLE "calendar_events" ADD CONSTRAINT IF NOT EXISTS "calendar_events_created_by_profiles_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE set null;

ALTER TABLE "withdrawals" ADD CONSTRAINT IF NOT EXISTS "withdrawals_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;
ALTER TABLE "withdrawals" ADD CONSTRAINT IF NOT EXISTS "withdrawals_student_id_students_id_fk"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE cascade;

ALTER TABLE "audit_log" ADD CONSTRAINT IF NOT EXISTS "audit_log_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE set null;
ALTER TABLE "audit_log" ADD CONSTRAINT IF NOT EXISTS "audit_log_user_id_profiles_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE set null;

ALTER TABLE "alerts" ADD CONSTRAINT IF NOT EXISTS "alerts_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;
ALTER TABLE "alerts" ADD CONSTRAINT IF NOT EXISTS "alerts_student_id_students_id_fk"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE cascade;

ALTER TABLE "appointments" ADD CONSTRAINT IF NOT EXISTS "appointments_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;
ALTER TABLE "appointments" ADD CONSTRAINT IF NOT EXISTS "appointments_user_id_profiles_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE cascade;

ALTER TABLE "teacher_assignments" ADD CONSTRAINT IF NOT EXISTS "teacher_assignments_teacher_id_profiles_id_fk"
  FOREIGN KEY ("teacher_id") REFERENCES "profiles"("id") ON DELETE cascade;
ALTER TABLE "teacher_assignments" ADD CONSTRAINT IF NOT EXISTS "teacher_assignments_division_id_divisions_id_fk"
  FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE cascade;
ALTER TABLE "teacher_assignments" ADD CONSTRAINT IF NOT EXISTS "teacher_assignments_subject_id_subjects_id_fk"
  FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE cascade;
ALTER TABLE "teacher_assignments" ADD CONSTRAINT IF NOT EXISTS "teacher_assignments_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;
ALTER TABLE "teacher_assignments" ADD CONSTRAINT IF NOT EXISTS "teacher_assignments_academic_year_id_academic_years_id_fk"
  FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE cascade;

ALTER TABLE "employee_attendance" ADD CONSTRAINT IF NOT EXISTS "employee_attendance_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;
ALTER TABLE "employee_attendance" ADD CONSTRAINT IF NOT EXISTS "employee_attendance_created_by_profiles_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE set null;

ALTER TABLE "employee_schedules" ADD CONSTRAINT IF NOT EXISTS "employee_schedules_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;

ALTER TABLE "division_schedules" ADD CONSTRAINT IF NOT EXISTS "division_schedules_division_id_divisions_id_fk"
  FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE cascade;
ALTER TABLE "division_schedules" ADD CONSTRAINT IF NOT EXISTS "division_schedules_subject_id_subjects_id_fk"
  FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE cascade;
ALTER TABLE "division_schedules" ADD CONSTRAINT IF NOT EXISTS "division_schedules_teacher_id_profiles_id_fk"
  FOREIGN KEY ("teacher_id") REFERENCES "profiles"("id") ON DELETE cascade;
ALTER TABLE "division_schedules" ADD CONSTRAINT IF NOT EXISTS "division_schedules_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;

ALTER TABLE "grades" ADD CONSTRAINT IF NOT EXISTS "grades_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;
ALTER TABLE "grades" ADD CONSTRAINT IF NOT EXISTS "grades_student_id_students_id_fk"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE cascade;
ALTER TABLE "grades" ADD CONSTRAINT IF NOT EXISTS "grades_subject_id_subjects_id_fk"
  FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE cascade;
ALTER TABLE "grades" ADD CONSTRAINT IF NOT EXISTS "grades_division_id_divisions_id_fk"
  FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE cascade;
ALTER TABLE "grades" ADD CONSTRAINT IF NOT EXISTS "grades_academic_year_id_academic_years_id_fk"
  FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE cascade;
ALTER TABLE "grades" ADD CONSTRAINT IF NOT EXISTS "grades_updated_by_profiles_id_fk"
  FOREIGN KEY ("updated_by") REFERENCES "profiles"("id") ON DELETE set null;

ALTER TABLE "preceptor_schools" ADD CONSTRAINT IF NOT EXISTS "preceptor_schools_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;

ALTER TABLE "teacher_schools" ADD CONSTRAINT IF NOT EXISTS "teacher_schools_school_id_schools_id_fk"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE cascade;

-- ── ÍNDICES ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "idx_academic_years_school_id" ON "academic_years" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_academic_years_active" ON "academic_years" USING btree ("active");
CREATE INDEX IF NOT EXISTS "idx_alerts_school_id" ON "alerts" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_alerts_student_id" ON "alerts" USING btree ("student_id");
CREATE INDEX IF NOT EXISTS "idx_alerts_type" ON "alerts" USING btree ("type");
CREATE INDEX IF NOT EXISTS "idx_alerts_read" ON "alerts" USING btree ("read");
CREATE INDEX IF NOT EXISTS "idx_appointments_school_id" ON "appointments" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_appointments_user_id" ON "appointments" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_appointments_start_date" ON "appointments" USING btree ("start_date");
CREATE INDEX IF NOT EXISTS "idx_attendance_school_id" ON "attendance" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_attendance_student_id" ON "attendance" USING btree ("student_id");
CREATE INDEX IF NOT EXISTS "idx_attendance_division_id" ON "attendance" USING btree ("division_id");
CREATE INDEX IF NOT EXISTS "idx_attendance_date" ON "attendance" USING btree ("date");
CREATE INDEX IF NOT EXISTS "idx_attendance_status" ON "attendance" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_attendance_student_date" ON "attendance" USING btree ("student_id","date");
CREATE INDEX IF NOT EXISTS "idx_attendance_log_attendance_id" ON "attendance_log" USING btree ("attendance_id");
CREATE INDEX IF NOT EXISTS "idx_attendance_log_changed_at" ON "attendance_log" USING btree ("changed_at");
CREATE INDEX IF NOT EXISTS "idx_audit_log_school_id" ON "audit_log" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_audit_log_user_id" ON "audit_log" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_log_table_name" ON "audit_log" USING btree ("table_name");
CREATE INDEX IF NOT EXISTS "idx_audit_log_created_at" ON "audit_log" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "idx_authorized_persons_student_id" ON "authorized_persons" USING btree ("student_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_school_id" ON "calendar_events" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_type" ON "calendar_events" USING btree ("type");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_start_date" ON "calendar_events" USING btree ("start_date");
CREATE INDEX IF NOT EXISTS "idx_communications_school_id" ON "communications" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_communications_student_id" ON "communications" USING btree ("student_id");
CREATE INDEX IF NOT EXISTS "idx_communications_type" ON "communications" USING btree ("type");
CREATE INDEX IF NOT EXISTS "idx_communications_sent_at" ON "communications" USING btree ("sent_at");
CREATE INDEX IF NOT EXISTS "idx_courses_school_id" ON "courses" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_courses_academic_year_id" ON "courses" USING btree ("academic_year_id");
CREATE INDEX IF NOT EXISTS "idx_division_schedules_division_id" ON "division_schedules" USING btree ("division_id");
CREATE INDEX IF NOT EXISTS "idx_division_schedules_teacher_id" ON "division_schedules" USING btree ("teacher_id");
CREATE INDEX IF NOT EXISTS "idx_division_schedules_school_id" ON "division_schedules" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_divisions_school_id" ON "divisions" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_divisions_course_id" ON "divisions" USING btree ("course_id");
CREATE INDEX IF NOT EXISTS "idx_divisions_academic_year_id" ON "divisions" USING btree ("academic_year_id");
CREATE INDEX IF NOT EXISTS "idx_documents_school_id" ON "documents" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_documents_student_id" ON "documents" USING btree ("student_id");
CREATE INDEX IF NOT EXISTS "idx_documents_type" ON "documents" USING btree ("type");
CREATE INDEX IF NOT EXISTS "idx_employee_attendance_school_id" ON "employee_attendance" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_employee_attendance_employee_id" ON "employee_attendance" USING btree ("employee_id");
CREATE INDEX IF NOT EXISTS "idx_employee_attendance_date" ON "employee_attendance" USING btree ("date");
CREATE INDEX IF NOT EXISTS "idx_employee_schedules_school_id" ON "employee_schedules" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_employee_schedules_employee_id" ON "employee_schedules" USING btree ("employee_id");
CREATE INDEX IF NOT EXISTS "idx_preceptor_book_school_id" ON "preceptor_book" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_preceptor_book_student_id" ON "preceptor_book" USING btree ("student_id");
CREATE INDEX IF NOT EXISTS "idx_preceptor_book_type" ON "preceptor_book" USING btree ("type");
CREATE INDEX IF NOT EXISTS "idx_preceptor_book_created_at" ON "preceptor_book" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "idx_profiles_school_id" ON "profiles" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_profiles_role" ON "profiles" USING btree ("role");
CREATE INDEX IF NOT EXISTS "idx_profiles_email" ON "profiles" USING btree ("email");
CREATE INDEX IF NOT EXISTS "idx_schools_active" ON "schools" USING btree ("active");
CREATE INDEX IF NOT EXISTS "idx_student_guardians_student_id" ON "student_guardians" USING btree ("student_id");
CREATE INDEX IF NOT EXISTS "idx_students_school_id" ON "students" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_students_division_id" ON "students" USING btree ("division_id");
CREATE INDEX IF NOT EXISTS "idx_students_dni" ON "students" USING btree ("dni");
CREATE INDEX IF NOT EXISTS "idx_students_status" ON "students" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_students_academic_year_id" ON "students" USING btree ("academic_year_id");
CREATE INDEX IF NOT EXISTS "idx_subjects_school_id" ON "subjects" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_subjects_academic_year_id" ON "subjects" USING btree ("academic_year_id");
CREATE INDEX IF NOT EXISTS "idx_teacher_assignments_teacher_id" ON "teacher_assignments" USING btree ("teacher_id");
CREATE INDEX IF NOT EXISTS "idx_teacher_assignments_division_id" ON "teacher_assignments" USING btree ("division_id");
CREATE INDEX IF NOT EXISTS "idx_teacher_assignments_subject_id" ON "teacher_assignments" USING btree ("subject_id");
CREATE INDEX IF NOT EXISTS "idx_teacher_assignments_school_id" ON "teacher_assignments" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_teacher_assignments_academic_year_id" ON "teacher_assignments" USING btree ("academic_year_id");
CREATE INDEX IF NOT EXISTS "idx_withdrawals_school_id" ON "withdrawals" USING btree ("school_id");
CREATE INDEX IF NOT EXISTS "idx_withdrawals_student_id" ON "withdrawals" USING btree ("student_id");
CREATE INDEX IF NOT EXISTS "idx_withdrawals_date" ON "withdrawals" USING btree ("date");

-- ── USUARIO SUPER_ADMIN ──────────────────────────────────────────────────────
-- IMPORTANTE: Registrá tu usuario primero desde la app (/auth)
-- Después ejecutá este bloque reemplazando el email y el id:
--
-- SELECT id, email FROM "user" WHERE email = 'matias.pagano07@gmail.com';
-- (copiar el id que devuelva)
--
-- Luego reemplazar TU_USER_ID_HERE abajo y ejecutar:

/*
INSERT INTO profiles (id, school_id, role, first_name, last_name, email)
VALUES ('TU_USER_ID_HERE', NULL, 'super_admin', 'Matias', 'Pagano', 'matias.pagano07@gmail.com')
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
*/
