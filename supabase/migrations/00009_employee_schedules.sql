-- ============================================================================
-- Employee schedules (which days and shifts each employee works)
-- Migration: 00009_employee_schedules.sql
-- ============================================================================

-- 1. Shift type
DO $$ BEGIN
  CREATE TYPE public.employee_shift AS ENUM ('mañana', 'tarde', 'vespertino', 'nocturno');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Employee schedules table
CREATE TABLE IF NOT EXISTS public.employee_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  shift public.employee_shift NOT NULL,
  UNIQUE(employee_id, day_of_week, shift)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee ON public.employee_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_school ON public.employee_schedules(school_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_day ON public.employee_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_shift ON public.employee_schedules(shift);

-- 4. Enable RLS
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies

-- Super admin can do everything
CREATE POLICY employee_schedules_super_admin ON public.employee_schedules
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Secretaries and directors can CRUD schedules for their school
CREATE POLICY employee_schedules_crud ON public.employee_schedules
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_school(employee_schedules.school_id)
    AND (
      public.is_school_admin(employee_schedules.school_id)
      OR public.is_secretary(employee_schedules.school_id)
    )
  )
  WITH CHECK (
    public.user_belongs_to_school(employee_schedules.school_id)
    AND (
      public.is_school_admin(employee_schedules.school_id)
      OR public.is_secretary(employee_schedules.school_id)
    )
  );

-- Employees can view their own schedule
CREATE POLICY employee_schedules_view_own ON public.employee_schedules
  FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

-- ============================================================================
-- End of migration 00009
-- ============================================================================
