-- ============================================================================
-- Employee attendance table (teachers, preceptors, secretaries)
-- Migration: 00007_employee_attendance.sql
-- ============================================================================

-- 1. Employee attendance status enum
DO $$ BEGIN
  CREATE TYPE public.employee_attendance_status AS ENUM (
    'present',
    'absent',
    'late',
    'justified_absence'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Employee attendance table
CREATE TABLE IF NOT EXISTS public.employee_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status public.employee_attendance_status NOT NULL,
  observation TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_employee_attendance_school_id ON public.employee_attendance(school_id);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_employee_id ON public.employee_attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_date ON public.employee_attendance(date);

-- 4. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_employee_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_employee_attendance_updated_at ON public.employee_attendance;
CREATE TRIGGER update_employee_attendance_updated_at
  BEFORE UPDATE ON public.employee_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_attendance_updated_at();

-- 5. Enable RLS
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies

-- Super admin can do everything
CREATE POLICY employee_attendance_super_admin ON public.employee_attendance
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Secretaries and directors can CRUD employee attendance for their school
CREATE POLICY employee_attendance_crud ON public.employee_attendance
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_school(employee_attendance.school_id)
    AND (
      public.is_school_admin(employee_attendance.school_id)
      OR public.is_secretary(employee_attendance.school_id)
    )
  )
  WITH CHECK (
    public.user_belongs_to_school(employee_attendance.school_id)
    AND (
      public.is_school_admin(employee_attendance.school_id)
      OR public.is_secretary(employee_attendance.school_id)
    )
  );

-- Employees can view their own attendance
CREATE POLICY employee_attendance_view_own ON public.employee_attendance
  FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

-- ============================================================================
-- End of migration 00007
-- ============================================================================
