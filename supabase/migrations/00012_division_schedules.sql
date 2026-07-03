-- ============================================================================
-- Division schedules (timetable per division)
-- Migration: 00012_division_schedules.sql
-- ============================================================================

-- 1. Division schedules table
CREATE TABLE IF NOT EXISTS public.division_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  UNIQUE(division_id, day_of_week, time_start)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_division_schedules_division ON public.division_schedules(division_id);
CREATE INDEX IF NOT EXISTS idx_division_schedules_teacher ON public.division_schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_division_schedules_subject ON public.division_schedules(subject_id);
CREATE INDEX IF NOT EXISTS idx_division_schedules_school ON public.division_schedules(school_id);
CREATE INDEX IF NOT EXISTS idx_division_schedules_day ON public.division_schedules(day_of_week);

-- 3. Enable RLS
ALTER TABLE public.division_schedules ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies

-- Super admin can do everything
CREATE POLICY division_schedules_super_admin ON public.division_schedules
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- School admins, directors, and secretaries can CRUD schedules
CREATE POLICY division_schedules_crud ON public.division_schedules
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_school(division_schedules.school_id)
    AND (
      public.is_school_admin(division_schedules.school_id)
      OR public.is_secretary(division_schedules.school_id)
    )
  )
  WITH CHECK (
    public.user_belongs_to_school(division_schedules.school_id)
    AND (
      public.is_school_admin(division_schedules.school_id)
      OR public.is_secretary(division_schedules.school_id)
    )
  );

-- Teachers can view their own assigned schedules
CREATE POLICY division_schedules_view_own ON public.division_schedules
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

-- ============================================================================
-- End of migration 00012
-- ============================================================================
