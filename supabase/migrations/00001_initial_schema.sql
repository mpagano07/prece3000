-- ============================================================================
-- Preceptor School Management System - Initial Schema
-- Migration: 00001_initial_schema.sql
-- Description: Creates all tables, indexes, triggers, RLS policies,
--              storage buckets, and helper functions.
-- ============================================================================

-- 0. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. HELPER FUNCTIONS
-- ============================================================================

-- Update updated_at column trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Handle new user signup - auto-create profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'school_admin')::public.user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Role-checking helper functions
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (SELECT role = 'super_admin' FROM public.profiles WHERE id = auth.uid()),
      FALSE
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_school_admin(_school_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (SELECT role = 'school_admin' AND school_id = _school_id FROM public.profiles WHERE id = auth.uid()),
      FALSE
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_preceptor(_school_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (SELECT role = 'preceptor' AND school_id = _school_id FROM public.profiles WHERE id = auth.uid()),
      FALSE
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_secretary(_school_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (SELECT role = 'secretary' AND school_id = _school_id FROM public.profiles WHERE id = auth.uid()),
      FALSE
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT school_id FROM public.profiles WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. CUSTOM ENUMS
-- ============================================================================

CREATE TYPE public.user_role AS ENUM (
  'super_admin',
  'school_admin',
  'preceptor',
  'secretary',
  'teacher'
);

CREATE TYPE public.attendance_status AS ENUM (
  'present',
  'absent',
  'absent_justified',
  'late',
  'early_withdrawal'
);

CREATE TYPE public.book_entry_type AS ENUM (
  'incident',
  'sanction',
  'warning',
  'phone_call',
  'interview',
  'meeting',
  'observation',
  'conduct_followup'
);

CREATE TYPE public.communication_type AS ENUM (
  'whatsapp',
  'email'
);

CREATE TYPE public.document_type AS ENUM (
  'medical_certificate',
  'authorization',
  'dni',
  'receipt',
  'school_insurance',
  'other'
);

CREATE TYPE public.event_type AS ENUM (
  'act',
  'institutional',
  'holiday',
  'exam',
  'meeting',
  'report_delivery'
);

CREATE TYPE public.alert_type AS ENUM (
  'excessive_absences',
  'near_failing',
  'missing_documentation',
  'incomplete_data',
  'birthday',
  'pending_communication'
);

-- 3. TABLES
-- ============================================================================

-- Schools
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  role public.user_role NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Academic Years
CREATE TABLE public.academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  active BOOLEAN DEFAULT FALSE
);

-- Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE
);

-- Divisions
CREATE TABLE public.divisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  shift TEXT,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE
);

-- Subjects
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE
);

-- Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dni TEXT NOT NULL UNIQUE,
  birth_date DATE,
  gender TEXT,
  nationality TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  blood_type TEXT,
  health_insurance TEXT,
  health_affiliate_number TEXT,
  doctor_name TEXT,
  doctor_phone TEXT,
  allergies TEXT,
  medication TEXT,
  restrictions TEXT,
  observations TEXT,
  status TEXT DEFAULT 'active',
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Student Guardians
CREATE TABLE public.student_guardians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  relationship TEXT NOT NULL
);

-- Authorized Persons (for student pickup)
CREATE TABLE public.authorized_persons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  document TEXT
);

-- Attendance Records
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status public.attendance_status NOT NULL,
  observation TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Attendance Change Log
CREATE TABLE public.attendance_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
  previous_status public.attendance_status,
  new_status public.attendance_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- Preceptor Book Entries
CREATE TABLE public.preceptor_book (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  type public.book_entry_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Communications (WhatsApp / Email)
CREATE TABLE public.communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  type public.communication_type NOT NULL,
  message TEXT NOT NULL,
  sent_to TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'sent'
);

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.document_type NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Calendar Events
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  type public.event_type NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Student Withdrawals (early departure records)
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  withdrawn_by TEXT NOT NULL,
  document TEXT,
  observations TEXT,
  signature TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  type public.alert_type NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Teacher-Division-Subject Assignments
CREATE TABLE public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE
);

-- 4. TRIGGERS
-- ============================================================================

-- Apply updated_at trigger to all tables with an updated_at column
CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. INDEXES
-- ============================================================================

-- Schools
CREATE INDEX idx_schools_active ON public.schools(active);

-- Profiles
CREATE INDEX idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Academic Years
CREATE INDEX idx_academic_years_school_id ON public.academic_years(school_id);
CREATE INDEX idx_academic_years_active ON public.academic_years(active);

-- Courses
CREATE INDEX idx_courses_school_id ON public.courses(school_id);
CREATE INDEX idx_courses_academic_year_id ON public.courses(academic_year_id);

-- Divisions
CREATE INDEX idx_divisions_school_id ON public.divisions(school_id);
CREATE INDEX idx_divisions_course_id ON public.divisions(course_id);
CREATE INDEX idx_divisions_academic_year_id ON public.divisions(academic_year_id);

-- Subjects
CREATE INDEX idx_subjects_school_id ON public.subjects(school_id);
CREATE INDEX idx_subjects_academic_year_id ON public.subjects(academic_year_id);

-- Students
CREATE INDEX idx_students_school_id ON public.students(school_id);
CREATE INDEX idx_students_division_id ON public.students(division_id);
CREATE INDEX idx_students_dni ON public.students(dni);
CREATE INDEX idx_students_status ON public.students(status);
CREATE INDEX idx_students_academic_year_id ON public.students(academic_year_id);

-- Student Guardians
CREATE INDEX idx_student_guardians_student_id ON public.student_guardians(student_id);

-- Authorized Persons
CREATE INDEX idx_authorized_persons_student_id ON public.authorized_persons(student_id);

-- Attendance
CREATE INDEX idx_attendance_school_id ON public.attendance(school_id);
CREATE INDEX idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX idx_attendance_division_id ON public.attendance(division_id);
CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE INDEX idx_attendance_status ON public.attendance(status);
CREATE INDEX idx_attendance_student_date ON public.attendance(student_id, date);

-- Attendance Log
CREATE INDEX idx_attendance_log_attendance_id ON public.attendance_log(attendance_id);
CREATE INDEX idx_attendance_log_changed_at ON public.attendance_log(changed_at);

-- Preceptor Book
CREATE INDEX idx_preceptor_book_school_id ON public.preceptor_book(school_id);
CREATE INDEX idx_preceptor_book_student_id ON public.preceptor_book(student_id);
CREATE INDEX idx_preceptor_book_type ON public.preceptor_book(type);
CREATE INDEX idx_preceptor_book_created_at ON public.preceptor_book(created_at);

-- Communications
CREATE INDEX idx_communications_school_id ON public.communications(school_id);
CREATE INDEX idx_communications_student_id ON public.communications(student_id);
CREATE INDEX idx_communications_type ON public.communications(type);
CREATE INDEX idx_communications_sent_at ON public.communications(sent_at);

-- Documents
CREATE INDEX idx_documents_school_id ON public.documents(school_id);
CREATE INDEX idx_documents_student_id ON public.documents(student_id);
CREATE INDEX idx_documents_type ON public.documents(type);

-- Calendar Events
CREATE INDEX idx_calendar_events_school_id ON public.calendar_events(school_id);
CREATE INDEX idx_calendar_events_type ON public.calendar_events(type);
CREATE INDEX idx_calendar_events_start_date ON public.calendar_events(start_date);

-- Withdrawals
CREATE INDEX idx_withdrawals_school_id ON public.withdrawals(school_id);
CREATE INDEX idx_withdrawals_student_id ON public.withdrawals(student_id);
CREATE INDEX idx_withdrawals_date ON public.withdrawals(date);

-- Audit Log
CREATE INDEX idx_audit_log_school_id ON public.audit_log(school_id);
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at);

-- Alerts
CREATE INDEX idx_alerts_school_id ON public.alerts(school_id);
CREATE INDEX idx_alerts_student_id ON public.alerts(student_id);
CREATE INDEX idx_alerts_type ON public.alerts(type);
CREATE INDEX idx_alerts_read ON public.alerts(read);

-- Appointments
CREATE INDEX idx_appointments_school_id ON public.appointments(school_id);
CREATE INDEX idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX idx_appointments_start_date ON public.appointments(start_date);

-- Teacher Assignments
CREATE INDEX idx_teacher_assignments_teacher_id ON public.teacher_assignments(teacher_id);
CREATE INDEX idx_teacher_assignments_division_id ON public.teacher_assignments(division_id);
CREATE INDEX idx_teacher_assignments_subject_id ON public.teacher_assignments(subject_id);
CREATE INDEX idx_teacher_assignments_school_id ON public.teacher_assignments(school_id);
CREATE INDEX idx_teacher_assignments_academic_year_id ON public.teacher_assignments(academic_year_id);

-- 6. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorized_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preceptor_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- --------------------- SCHOOLS ---------------------
CREATE POLICY schools_super_admin_all ON public.schools
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY schools_school_admin_view ON public.schools
  FOR SELECT
  TO authenticated
  USING (
    public.is_school_admin(id)
    OR public.is_preceptor(id)
    OR public.is_secretary(id)
  );

-- --------------------- PROFILES ---------------------
CREATE POLICY profiles_view_own ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_super_admin_all ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY profiles_school_admin_view_school ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
    AND school_id = public.get_user_school_id()
  );

-- --------------------- ACADEMIC YEARS ---------------------
CREATE POLICY academic_years_super_admin_all ON public.academic_years
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY academic_years_school_access ON public.academic_years
  FOR ALL
  TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  )
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  );

-- --------------------- COURSES ---------------------
CREATE POLICY courses_super_admin_all ON public.courses
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY courses_school_access ON public.courses
  FOR ALL
  TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  )
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  );

-- --------------------- DIVISIONS ---------------------
CREATE POLICY divisions_super_admin_all ON public.divisions
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY divisions_school_access ON public.divisions
  FOR ALL
  TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  )
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  );

-- --------------------- SUBJECTS ---------------------
CREATE POLICY subjects_super_admin_all ON public.subjects
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY subjects_school_access ON public.subjects
  FOR ALL
  TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  )
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  );

-- --------------------- STUDENTS ---------------------
CREATE POLICY students_super_admin_all ON public.students
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY students_view_school ON public.students
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  );

CREATE POLICY students_insert_school ON public.students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id))
  );

CREATE POLICY students_update_school ON public.students
  FOR UPDATE
  TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id))
  )
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id))
  );

CREATE POLICY students_delete_school ON public.students
  FOR DELETE
  TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND public.is_school_admin(academic_years.school_id)
  );

-- --------------------- STUDENT GUARDIANS ---------------------
CREATE POLICY student_guardians_super_admin_all ON public.student_guardians
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY student_guardians_school_access ON public.student_guardians
  FOR ALL
  TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE school_id = public.get_user_school_id())
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()) OR public.is_secretary(public.get_user_school_id()))
  )
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE school_id = public.get_user_school_id())
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

-- --------------------- AUTHORIZED PERSONS ---------------------
CREATE POLICY authorized_persons_super_admin_all ON public.authorized_persons
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY authorized_persons_school_access ON public.authorized_persons
  FOR ALL
  TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE school_id = public.get_user_school_id())
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()) OR public.is_secretary(public.get_user_school_id()))
  )
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE school_id = public.get_user_school_id())
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

-- --------------------- ATTENDANCE ---------------------
CREATE POLICY attendance_super_admin_all ON public.attendance
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY attendance_crud_school ON public.attendance
  FOR ALL
  TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id))
  )
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id))
  );

CREATE POLICY attendance_view_school ON public.attendance
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND public.is_secretary(academic_years.school_id)
  );

-- --------------------- ATTENDANCE LOG ---------------------
CREATE POLICY attendance_log_super_admin_all ON public.attendance_log
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY attendance_log_school_access ON public.attendance_log
  FOR ALL
  TO authenticated
  USING (
    attendance_id IN (SELECT id FROM public.attendance WHERE school_id = public.get_user_school_id())
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  )
  WITH CHECK (
    attendance_id IN (SELECT id FROM public.attendance WHERE school_id = public.get_user_school_id())
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

-- --------------------- PRECEPTOR BOOK ---------------------
CREATE POLICY preceptor_book_super_admin_all ON public.preceptor_book
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY preceptor_book_school_access ON public.preceptor_book
  FOR ALL
  TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  )
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id))
  );

-- --------------------- COMMUNICATIONS ---------------------
CREATE POLICY communications_super_admin_all ON public.communications
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY communications_school_access ON public.communications
  FOR ALL
  TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  )
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id))
  );

-- --------------------- DOCUMENTS ---------------------
CREATE POLICY documents_super_admin_all ON public.documents
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY documents_school_access ON public.documents
  FOR ALL
  TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  )
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id))
  );

-- --------------------- CALENDAR EVENTS ---------------------
CREATE POLICY calendar_events_super_admin_all ON public.calendar_events
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY calendar_events_school_access ON public.calendar_events
  FOR ALL
  TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  )
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  );

-- --------------------- WITHDRAWALS ---------------------
CREATE POLICY withdrawals_super_admin_all ON public.withdrawals
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY withdrawals_school_access ON public.withdrawals
  FOR ALL
  TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id))
  )
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id))
  );

-- --------------------- AUDIT LOG ---------------------
CREATE POLICY audit_log_super_admin_all ON public.audit_log
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY audit_log_view_school ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id))
  );

-- --------------------- ALERTS ---------------------
CREATE POLICY alerts_super_admin_all ON public.alerts
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY alerts_school_access ON public.alerts
  FOR ALL
  TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  )
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id))
  );

-- --------------------- APPOINTMENTS ---------------------
CREATE POLICY appointments_super_admin_all ON public.appointments
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY appointments_own ON public.appointments
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (school_id = public.get_user_school_id() AND public.is_school_admin(academic_years.school_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (school_id = public.get_user_school_id() AND public.is_school_admin(academic_years.school_id))
  );

-- --------------------- TEACHER ASSIGNMENTS ---------------------
CREATE POLICY teacher_assignments_super_admin_all ON public.teacher_assignments
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY teacher_assignments_school_access ON public.teacher_assignments
  FOR ALL
  TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id))
  )
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND public.is_school_admin(academic_years.school_id)
  );

CREATE POLICY teacher_assignments_view_own ON public.teacher_assignments
  FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

-- 7. STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('student-photos', 'student-photos', FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('documents', 'documents', FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for student-photos bucket
CREATE POLICY "student_photos_school_access_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'student-photos'
    AND (
      public.is_super_admin()
      OR (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.photo_url LIKE '%' || name
          AND s.school_id = public.get_user_school_id()
        )
      )
    )
  );

CREATE POLICY "student_photos_school_access_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'student-photos'
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

CREATE POLICY "student_photos_school_access_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'student-photos'
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

-- Storage policies for documents bucket
CREATE POLICY "documents_school_access_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      public.is_super_admin()
      OR (
        EXISTS (
          SELECT 1 FROM public.documents d
          WHERE d.file_url LIKE '%' || name
          AND d.school_id = public.get_user_school_id()
        )
      )
    )
  );

CREATE POLICY "documents_school_access_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

CREATE POLICY "documents_school_access_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

-- ============================================================================
-- Schema version: 1.0.0
-- Migration: 00001_initial_schema
-- Applied at: <timestamp>
-- ============================================================================
