-- ============================================================================
-- Fix RLS policy column references and ensure preceptor access
-- Migration: 00005_fix_rls_policies.sql
-- ============================================================================
-- Las políticas originales en 00001 usaban `academic_years.school_id`
-- en tablas como courses, divisions, etc., causando errores de columna
-- inexistente. Se reemplazan con referencias calificadas correctas.
-- ============================================================================

-- 1. Recrear funciones helper (incluye director de 00004)
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
      (SELECT (role = 'school_admin' OR role = 'director') AND school_id = _school_id FROM public.profiles WHERE id = auth.uid()),
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

-- 2. Eliminar todas las políticas RLS existentes
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 3. Recrear políticas con referencias de columna calificadas correctas

-- SCHOOLS
CREATE POLICY schools_super_admin_all ON public.schools
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY schools_school_admin_view ON public.schools
  FOR SELECT TO authenticated
  USING (id = public.get_user_school_id());

-- PROFILES
CREATE POLICY profiles_view_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_super_admin_all ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY profiles_school_admin_view_school ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (public.is_school_admin(profiles.school_id) OR public.is_preceptor(profiles.school_id) OR public.is_secretary(profiles.school_id))
    AND profiles.school_id = public.get_user_school_id()
  );

-- ACADEMIC YEARS
CREATE POLICY academic_years_super_admin_all ON public.academic_years
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY academic_years_school_access ON public.academic_years
  FOR ALL TO authenticated
  USING (
    academic_years.school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  )
  WITH CHECK (
    academic_years.school_id = public.get_user_school_id()
    AND (public.is_school_admin(academic_years.school_id) OR public.is_preceptor(academic_years.school_id) OR public.is_secretary(academic_years.school_id))
  );

-- COURSES (usando courses.school_id, NO academic_years.school_id)
CREATE POLICY courses_super_admin_all ON public.courses
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY courses_school_access ON public.courses
  FOR ALL TO authenticated
  USING (
    courses.school_id = public.get_user_school_id()
    AND (public.is_school_admin(courses.school_id) OR public.is_preceptor(courses.school_id) OR public.is_secretary(courses.school_id))
  )
  WITH CHECK (
    courses.school_id = public.get_user_school_id()
    AND (public.is_school_admin(courses.school_id) OR public.is_preceptor(courses.school_id))
  );

-- DIVISIONS (usando divisions.school_id)
CREATE POLICY divisions_super_admin_all ON public.divisions
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY divisions_school_access ON public.divisions
  FOR ALL TO authenticated
  USING (
    divisions.school_id = public.get_user_school_id()
    AND (public.is_school_admin(divisions.school_id) OR public.is_preceptor(divisions.school_id) OR public.is_secretary(divisions.school_id))
  )
  WITH CHECK (
    divisions.school_id = public.get_user_school_id()
    AND (public.is_school_admin(divisions.school_id) OR public.is_preceptor(divisions.school_id))
  );

-- SUBJECTS
CREATE POLICY subjects_super_admin_all ON public.subjects
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY subjects_school_access ON public.subjects
  FOR ALL TO authenticated
  USING (
    subjects.school_id = public.get_user_school_id()
    AND (public.is_school_admin(subjects.school_id) OR public.is_preceptor(subjects.school_id) OR public.is_secretary(subjects.school_id))
  )
  WITH CHECK (
    subjects.school_id = public.get_user_school_id()
    AND (public.is_school_admin(subjects.school_id) OR public.is_preceptor(subjects.school_id))
  );

-- STUDENTS
CREATE POLICY students_super_admin_all ON public.students
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY students_view_school ON public.students
  FOR SELECT TO authenticated
  USING (
    students.school_id = public.get_user_school_id()
    AND (public.is_school_admin(students.school_id) OR public.is_preceptor(students.school_id) OR public.is_secretary(students.school_id))
  );

CREATE POLICY students_insert_school ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (
    students.school_id = public.get_user_school_id()
    AND (public.is_school_admin(students.school_id) OR public.is_preceptor(students.school_id))
  );

CREATE POLICY students_update_school ON public.students
  FOR UPDATE TO authenticated
  USING (
    students.school_id = public.get_user_school_id()
    AND (public.is_school_admin(students.school_id) OR public.is_preceptor(students.school_id))
  )
  WITH CHECK (
    students.school_id = public.get_user_school_id()
    AND (public.is_school_admin(students.school_id) OR public.is_preceptor(students.school_id))
  );

CREATE POLICY students_delete_school ON public.students
  FOR DELETE TO authenticated
  USING (
    students.school_id = public.get_user_school_id()
    AND public.is_school_admin(students.school_id)
  );

-- STUDENT GUARDIANS
CREATE POLICY student_guardians_super_admin_all ON public.student_guardians
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY student_guardians_school_access ON public.student_guardians
  FOR ALL TO authenticated
  USING (
    student_guardians.student_id IN (SELECT id FROM public.students WHERE school_id = public.get_user_school_id())
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()) OR public.is_secretary(public.get_user_school_id()))
  )
  WITH CHECK (
    student_guardians.student_id IN (SELECT id FROM public.students WHERE school_id = public.get_user_school_id())
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

-- AUTHORIZED PERSONS
CREATE POLICY authorized_persons_super_admin_all ON public.authorized_persons
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY authorized_persons_school_access ON public.authorized_persons
  FOR ALL TO authenticated
  USING (
    authorized_persons.student_id IN (SELECT id FROM public.students WHERE school_id = public.get_user_school_id())
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()) OR public.is_secretary(public.get_user_school_id()))
  )
  WITH CHECK (
    authorized_persons.student_id IN (SELECT id FROM public.students WHERE school_id = public.get_user_school_id())
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

-- ATTENDANCE (usando attendance.school_id)
CREATE POLICY attendance_super_admin_all ON public.attendance
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY attendance_crud_school ON public.attendance
  FOR ALL TO authenticated
  USING (
    attendance.school_id = public.get_user_school_id()
    AND (public.is_school_admin(attendance.school_id) OR public.is_preceptor(attendance.school_id))
  )
  WITH CHECK (
    attendance.school_id = public.get_user_school_id()
    AND (public.is_school_admin(attendance.school_id) OR public.is_preceptor(attendance.school_id))
  );

CREATE POLICY attendance_view_school ON public.attendance
  FOR SELECT TO authenticated
  USING (
    attendance.school_id = public.get_user_school_id()
    AND public.is_secretary(attendance.school_id)
  );

-- ATTENDANCE LOG
CREATE POLICY attendance_log_super_admin_all ON public.attendance_log
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY attendance_log_school_access ON public.attendance_log
  FOR ALL TO authenticated
  USING (
    attendance_log.attendance_id IN (SELECT id FROM public.attendance WHERE school_id = public.get_user_school_id())
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  )
  WITH CHECK (
    attendance_log.attendance_id IN (SELECT id FROM public.attendance WHERE school_id = public.get_user_school_id())
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

-- PRECEPTOR BOOK
CREATE POLICY preceptor_book_super_admin_all ON public.preceptor_book
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY preceptor_book_school_access ON public.preceptor_book
  FOR ALL TO authenticated
  USING (
    preceptor_book.school_id = public.get_user_school_id()
    AND (public.is_school_admin(preceptor_book.school_id) OR public.is_preceptor(preceptor_book.school_id) OR public.is_secretary(preceptor_book.school_id))
  )
  WITH CHECK (
    preceptor_book.school_id = public.get_user_school_id()
    AND (public.is_school_admin(preceptor_book.school_id) OR public.is_preceptor(preceptor_book.school_id))
  );

-- COMMUNICATIONS
CREATE POLICY communications_super_admin_all ON public.communications
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY communications_school_access ON public.communications
  FOR ALL TO authenticated
  USING (
    communications.school_id = public.get_user_school_id()
    AND (public.is_school_admin(communications.school_id) OR public.is_preceptor(communications.school_id) OR public.is_secretary(communications.school_id))
  )
  WITH CHECK (
    communications.school_id = public.get_user_school_id()
    AND (public.is_school_admin(communications.school_id) OR public.is_preceptor(communications.school_id))
  );

-- DOCUMENTS
CREATE POLICY documents_super_admin_all ON public.documents
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY documents_school_access ON public.documents
  FOR ALL TO authenticated
  USING (
    documents.school_id = public.get_user_school_id()
    AND (public.is_school_admin(documents.school_id) OR public.is_preceptor(documents.school_id) OR public.is_secretary(documents.school_id))
  )
  WITH CHECK (
    documents.school_id = public.get_user_school_id()
    AND (public.is_school_admin(documents.school_id) OR public.is_preceptor(documents.school_id))
  );

-- CALENDAR EVENTS
CREATE POLICY calendar_events_super_admin_all ON public.calendar_events
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY calendar_events_school_access ON public.calendar_events
  FOR ALL TO authenticated
  USING (
    calendar_events.school_id = public.get_user_school_id()
    AND (public.is_school_admin(calendar_events.school_id) OR public.is_preceptor(calendar_events.school_id) OR public.is_secretary(calendar_events.school_id))
  )
  WITH CHECK (
    calendar_events.school_id = public.get_user_school_id()
    AND (public.is_school_admin(calendar_events.school_id) OR public.is_preceptor(calendar_events.school_id) OR public.is_secretary(calendar_events.school_id))
  );

-- WITHDRAWALS
CREATE POLICY withdrawals_super_admin_all ON public.withdrawals
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY withdrawals_school_access ON public.withdrawals
  FOR ALL TO authenticated
  USING (
    withdrawals.school_id = public.get_user_school_id()
    AND (public.is_school_admin(withdrawals.school_id) OR public.is_preceptor(withdrawals.school_id) OR public.is_secretary(withdrawals.school_id))
  )
  WITH CHECK (
    withdrawals.school_id = public.get_user_school_id()
    AND (public.is_school_admin(withdrawals.school_id) OR public.is_preceptor(withdrawals.school_id) OR public.is_secretary(withdrawals.school_id))
  );

-- AUDIT LOG
CREATE POLICY audit_log_super_admin_all ON public.audit_log
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY audit_log_view_school ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND public.is_school_admin(school_id)
  );

-- ALERTS
CREATE POLICY alerts_super_admin_all ON public.alerts
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY alerts_school_access ON public.alerts
  FOR ALL TO authenticated
  USING (
    alerts.school_id = public.get_user_school_id()
    AND (public.is_school_admin(alerts.school_id) OR public.is_preceptor(alerts.school_id) OR public.is_secretary(alerts.school_id))
  )
  WITH CHECK (
    alerts.school_id = public.get_user_school_id()
    AND (public.is_school_admin(alerts.school_id) OR public.is_preceptor(alerts.school_id))
  );

-- APPOINTMENTS
CREATE POLICY appointments_super_admin_all ON public.appointments
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY appointments_school_access ON public.appointments
  FOR ALL TO authenticated
  USING (
    appointments.school_id = public.get_user_school_id()
    AND (public.is_school_admin(appointments.school_id) OR public.is_preceptor(appointments.school_id) OR public.is_secretary(appointments.school_id))
  )
  WITH CHECK (
    appointments.school_id = public.get_user_school_id()
    AND (public.is_school_admin(appointments.school_id) OR public.is_preceptor(appointments.school_id) OR public.is_secretary(appointments.school_id))
  );

-- TEACHER ASSIGNMENTS
CREATE POLICY teacher_assignments_super_admin_all ON public.teacher_assignments
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY teacher_assignments_school_access ON public.teacher_assignments
  FOR ALL TO authenticated
  USING (
    teacher_assignments.school_id = public.get_user_school_id()
    AND (public.is_school_admin(teacher_assignments.school_id) OR public.is_preceptor(teacher_assignments.school_id) OR public.is_secretary(teacher_assignments.school_id))
  )
  WITH CHECK (
    teacher_assignments.school_id = public.get_user_school_id()
    AND public.is_school_admin(teacher_assignments.school_id)
  );

CREATE POLICY teacher_assignments_view_own ON public.teacher_assignments
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

-- ============================================================================
-- Migration: 00005_fix_rls_policies
-- ============================================================================
