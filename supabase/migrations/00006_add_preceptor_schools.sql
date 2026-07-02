-- ============================================================================
-- Add preceptor_schools junction table for multi-school preceptor support
-- Migration: 00006_add_preceptor_schools.sql
-- ============================================================================

-- 1. Create preceptor_schools junction table
CREATE TABLE IF NOT EXISTS public.preceptor_schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  preceptor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(preceptor_id, school_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_preceptor_schools_preceptor_id ON public.preceptor_schools(preceptor_id);
CREATE INDEX IF NOT EXISTS idx_preceptor_schools_school_id ON public.preceptor_schools(school_id);

-- Enable RLS
ALTER TABLE public.preceptor_schools ENABLE ROW LEVEL SECURITY;

-- 2. Create helper function to check if user has access to a school
CREATE OR REPLACE FUNCTION public.user_belongs_to_school(_school_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT EXISTS(
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND school_id = _school_id
    ) OR EXISTS(
      SELECT 1 FROM public.preceptor_schools
      WHERE preceptor_id = auth.uid() AND school_id = _school_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update is_preceptor to also check preceptor_schools
CREATE OR REPLACE FUNCTION public.is_preceptor(_school_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT EXISTS(
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'preceptor' AND school_id = _school_id
    ) OR EXISTS(
      SELECT 1 FROM public.preceptor_schools ps
      JOIN public.profiles p ON p.id = ps.preceptor_id
      WHERE ps.preceptor_id = auth.uid() AND ps.school_id = _school_id AND p.role = 'preceptor'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS policies for preceptor_schools
CREATE POLICY preceptor_schools_super_admin_all ON public.preceptor_schools
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY preceptor_schools_view_own ON public.preceptor_schools
  FOR SELECT TO authenticated
  USING (preceptor_id = auth.uid());

-- 5. Update existing RLS policies to use user_belongs_to_school
-- Drop policies that use school_id = get_user_school_id() pattern

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual::text LIKE '%get_user_school_id%' OR with_check::text LIKE '%get_user_school_id%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Recreate policies with user_belongs_to_school where applicable

-- ACADEMIC YEARS
CREATE POLICY academic_years_school_access ON public.academic_years
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_school(academic_years.school_id)
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  )
  WITH CHECK (
    public.user_belongs_to_school(academic_years.school_id)
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  );

-- COURSES
CREATE POLICY courses_school_access ON public.courses
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_school(courses.school_id)
    AND (public.is_school_admin(courses.school_id) OR public.is_preceptor(courses.school_id) OR public.is_secretary(courses.school_id))
  )
  WITH CHECK (
    public.user_belongs_to_school(courses.school_id)
    AND (public.is_school_admin(courses.school_id) OR public.is_preceptor(courses.school_id))
  );

-- DIVISIONS
CREATE POLICY divisions_school_access ON public.divisions
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_school(divisions.school_id)
    AND (public.is_school_admin(divisions.school_id) OR public.is_preceptor(divisions.school_id) OR public.is_secretary(divisions.school_id))
  )
  WITH CHECK (
    public.user_belongs_to_school(divisions.school_id)
    AND (public.is_school_admin(divisions.school_id) OR public.is_preceptor(divisions.school_id))
  );

-- SUBJECTS
CREATE POLICY subjects_school_access ON public.subjects
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_school(subjects.school_id)
    AND (public.is_school_admin(subjects.school_id) OR public.is_preceptor(subjects.school_id) OR public.is_secretary(subjects.school_id))
  )
  WITH CHECK (
    public.user_belongs_to_school(subjects.school_id)
    AND (public.is_school_admin(subjects.school_id) OR public.is_preceptor(subjects.school_id))
  );

-- STUDENTS
CREATE POLICY students_view_school ON public.students
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_school(students.school_id)
    AND (public.is_school_admin(students.school_id) OR public.is_preceptor(students.school_id) OR public.is_secretary(students.school_id))
  );

CREATE POLICY students_insert_school ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_belongs_to_school(students.school_id)
    AND (public.is_school_admin(students.school_id) OR public.is_preceptor(students.school_id))
  );

CREATE POLICY students_update_school ON public.students
  FOR UPDATE TO authenticated
  USING (
    public.user_belongs_to_school(students.school_id)
    AND (public.is_school_admin(students.school_id) OR public.is_preceptor(students.school_id))
  )
  WITH CHECK (
    public.user_belongs_to_school(students.school_id)
    AND (public.is_school_admin(students.school_id) OR public.is_preceptor(students.school_id))
  );

CREATE POLICY students_delete_school ON public.students
  FOR DELETE TO authenticated
  USING (
    public.user_belongs_to_school(students.school_id)
    AND public.is_school_admin(students.school_id)
  );

-- ATTENDANCE
CREATE POLICY attendance_crud_school ON public.attendance
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_school(attendance.school_id)
    AND (public.is_school_admin(attendance.school_id) OR public.is_preceptor(attendance.school_id))
  )
  WITH CHECK (
    public.user_belongs_to_school(attendance.school_id)
    AND (public.is_school_admin(attendance.school_id) OR public.is_preceptor(attendance.school_id))
  );

CREATE POLICY attendance_view_school ON public.attendance
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_school(attendance.school_id)
    AND public.is_secretary(attendance.school_id)
  );

-- PRECEPTOR BOOK
CREATE POLICY preceptor_book_school_access ON public.preceptor_book
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_school(preceptor_book.school_id)
    AND (public.is_school_admin(preceptor_book.school_id) OR public.is_preceptor(preceptor_book.school_id) OR public.is_secretary(preceptor_book.school_id))
  )
  WITH CHECK (
    public.user_belongs_to_school(preceptor_book.school_id)
    AND (public.is_school_admin(preceptor_book.school_id) OR public.is_preceptor(preceptor_book.school_id))
  );

-- COMMUNICATIONS
CREATE POLICY communications_school_access ON public.communications
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_school(communications.school_id)
    AND (public.is_school_admin(communications.school_id) OR public.is_preceptor(communications.school_id) OR public.is_secretary(communications.school_id))
  )
  WITH CHECK (
    public.user_belongs_to_school(communications.school_id)
    AND (public.is_school_admin(communications.school_id) OR public.is_preceptor(communications.school_id))
  );

-- DOCUMENTS
CREATE POLICY documents_school_access ON public.documents
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_school(documents.school_id)
    AND (public.is_school_admin(documents.school_id) OR public.is_preceptor(documents.school_id) OR public.is_secretary(documents.school_id))
  )
  WITH CHECK (
    public.user_belongs_to_school(documents.school_id)
    AND (public.is_school_admin(documents.school_id) OR public.is_preceptor(documents.school_id))
  );

-- CALENDAR EVENTS
CREATE POLICY calendar_events_school_access ON public.calendar_events
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_school(calendar_events.school_id)
    AND (public.is_school_admin(calendar_events.school_id) OR public.is_preceptor(calendar_events.school_id) OR public.is_secretary(calendar_events.school_id))
  )
  WITH CHECK (
    public.user_belongs_to_school(calendar_events.school_id)
    AND (public.is_school_admin(calendar_events.school_id) OR public.is_preceptor(calendar_events.school_id) OR public.is_secretary(calendar_events.school_id))
  );

-- WITHDRAWALS
CREATE POLICY withdrawals_school_access ON public.withdrawals
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_school(withdrawals.school_id)
    AND (public.is_school_admin(withdrawals.school_id) OR public.is_preceptor(withdrawals.school_id) OR public.is_secretary(withdrawals.school_id))
  )
  WITH CHECK (
    public.user_belongs_to_school(withdrawals.school_id)
    AND (public.is_school_admin(withdrawals.school_id) OR public.is_preceptor(withdrawals.school_id) OR public.is_secretary(withdrawals.school_id))
  );

-- ALERTS
CREATE POLICY alerts_school_access ON public.alerts
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_school(alerts.school_id)
    AND (public.is_school_admin(alerts.school_id) OR public.is_preceptor(alerts.school_id) OR public.is_secretary(alerts.school_id))
  )
  WITH CHECK (
    public.user_belongs_to_school(alerts.school_id)
    AND (public.is_school_admin(alerts.school_id) OR public.is_preceptor(alerts.school_id))
  );

-- APPOINTMENTS
CREATE POLICY appointments_school_access ON public.appointments
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_school(appointments.school_id)
    AND (public.is_school_admin(appointments.school_id) OR public.is_preceptor(appointments.school_id) OR public.is_secretary(appointments.school_id))
  )
  WITH CHECK (
    public.user_belongs_to_school(appointments.school_id)
    AND (public.is_school_admin(appointments.school_id) OR public.is_preceptor(appointments.school_id) OR public.is_secretary(appointments.school_id))
  );

-- TEACHER ASSIGNMENTS
CREATE POLICY teacher_assignments_school_access ON public.teacher_assignments
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_school(teacher_assignments.school_id)
    AND (public.is_school_admin(teacher_assignments.school_id) OR public.is_preceptor(teacher_assignments.school_id) OR public.is_secretary(teacher_assignments.school_id))
  )
  WITH CHECK (
    public.user_belongs_to_school(teacher_assignments.school_id)
    AND public.is_school_admin(teacher_assignments.school_id)
  );

-- SCHOOLS (view own school)
CREATE POLICY schools_school_admin_view ON public.schools
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_school(id));

-- PROFILES (view profiles in same school)
CREATE POLICY profiles_school_admin_view_school ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (public.is_school_admin(profiles.school_id) OR public.is_preceptor(profiles.school_id) OR public.is_secretary(profiles.school_id))
    AND public.user_belongs_to_school(profiles.school_id)
  );

-- ATTENDANCE LOG
CREATE POLICY attendance_log_school_access ON public.attendance_log
  FOR ALL TO authenticated
  USING (
    attendance_log.attendance_id IN (SELECT id FROM public.attendance WHERE public.user_belongs_to_school(school_id))
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  )
  WITH CHECK (
    attendance_log.attendance_id IN (SELECT id FROM public.attendance WHERE public.user_belongs_to_school(school_id))
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

-- STUDENT GUARDIANS
CREATE POLICY student_guardians_school_access ON public.student_guardians
  FOR ALL TO authenticated
  USING (
    student_guardians.student_id IN (SELECT id FROM public.students WHERE public.user_belongs_to_school(school_id))
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()) OR public.is_secretary(public.get_user_school_id()))
  )
  WITH CHECK (
    student_guardians.student_id IN (SELECT id FROM public.students WHERE public.user_belongs_to_school(school_id))
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

-- AUTHORIZED PERSONS
CREATE POLICY authorized_persons_school_access ON public.authorized_persons
  FOR ALL TO authenticated
  USING (
    authorized_persons.student_id IN (SELECT id FROM public.students WHERE public.user_belongs_to_school(school_id))
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()) OR public.is_secretary(public.get_user_school_id()))
  )
  WITH CHECK (
    authorized_persons.student_id IN (SELECT id FROM public.students WHERE public.user_belongs_to_school(school_id))
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

-- ============================================================================
-- Migration: 00006_add_preceptor_schools
-- ============================================================================
