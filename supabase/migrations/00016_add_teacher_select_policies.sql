-- ============================================================================
-- Add teacher role to SELECT policies for core tables
-- Migration: 00016_add_teacher_select_policies.sql
-- ============================================================================

-- 1. Create is_teacher helper function
CREATE OR REPLACE FUNCTION public.is_teacher(_school_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT EXISTS(
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher' AND school_id = _school_id
    ) OR EXISTS(
      SELECT 1 FROM public.teacher_schools
      WHERE teacher_id = auth.uid() AND school_id = _school_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add teacher SELECT policies to core tables
-- Teachers can SELECT courses, divisions, subjects, students, etc.
-- but NOT modify them (no INSERT/UPDATE/DELETE)

-- ACADEMIC YEARS
DROP POLICY IF EXISTS academic_years_teacher_select ON public.academic_years;
CREATE POLICY academic_years_teacher_select ON public.academic_years
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_school(academic_years.school_id)
    AND public.is_teacher(academic_years.school_id)
  );

-- COURSES
DROP POLICY IF EXISTS courses_teacher_select ON public.courses;
CREATE POLICY courses_teacher_select ON public.courses
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_school(courses.school_id)
    AND public.is_teacher(courses.school_id)
  );

-- DIVISIONS
DROP POLICY IF EXISTS divisions_teacher_select ON public.divisions;
CREATE POLICY divisions_teacher_select ON public.divisions
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_school(divisions.school_id)
    AND public.is_teacher(divisions.school_id)
  );

-- SUBJECTS
DROP POLICY IF EXISTS subjects_teacher_select ON public.subjects;
CREATE POLICY subjects_teacher_select ON public.subjects
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_school(subjects.school_id)
    AND public.is_teacher(subjects.school_id)
  );

-- STUDENTS
DROP POLICY IF EXISTS students_teacher_select ON public.students;
CREATE POLICY students_teacher_select ON public.students
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_school(students.school_id)
    AND public.is_teacher(students.school_id)
  );

-- TEACHER ASSIGNMENTS
DROP POLICY IF EXISTS teacher_assignments_teacher_select ON public.teacher_assignments;
CREATE POLICY teacher_assignments_teacher_select ON public.teacher_assignments
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_school(teacher_assignments.school_id)
    AND public.is_teacher(teacher_assignments.school_id)
  );

-- DIVISION SCHEDULES (broader than view_own — teachers can see all schedules for their school)
DROP POLICY IF EXISTS division_schedules_teacher_select ON public.division_schedules;
CREATE POLICY division_schedules_teacher_select ON public.division_schedules
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_school(division_schedules.school_id)
    AND public.is_teacher(division_schedules.school_id)
  );

-- Preceptors also need SELECT on division_schedules (to see subjects per division in grades, etc.)
DROP POLICY IF EXISTS division_schedules_preceptor_select ON public.division_schedules;
CREATE POLICY division_schedules_preceptor_select ON public.division_schedules
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_school(division_schedules.school_id)
    AND public.is_preceptor(division_schedules.school_id)
  );

-- CALENDAR EVENTS
DROP POLICY IF EXISTS calendar_events_teacher_select ON public.calendar_events;
CREATE POLICY calendar_events_teacher_select ON public.calendar_events
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_school(calendar_events.school_id)
    AND public.is_teacher(calendar_events.school_id)
  );

-- PROFILES (teachers can view other profiles in their school)
DROP POLICY IF EXISTS profiles_teacher_select ON public.profiles;
CREATE POLICY profiles_teacher_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_school(profiles.school_id)
    AND public.is_teacher(profiles.school_id)
  );

-- ============================================================================
-- Migration: 00016_add_teacher_select_policies
-- ============================================================================
