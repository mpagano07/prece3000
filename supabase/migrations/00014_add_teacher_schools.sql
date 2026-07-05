-- ============================================================================
-- Add teacher_schools junction table for multi-school teacher support
-- Migration: 00014_add_teacher_schools.sql
-- ============================================================================

-- 1. Create teacher_schools junction table (like preceptor_schools)
CREATE TABLE IF NOT EXISTS public.teacher_schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id, school_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_schools_teacher_id ON public.teacher_schools(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_schools_school_id ON public.teacher_schools(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_schools_deactivated_at ON public.teacher_schools(deactivated_at);

-- Enable RLS
ALTER TABLE public.teacher_schools ENABLE ROW LEVEL SECURITY;

-- 2. RLS policies for teacher_schools
DROP POLICY IF EXISTS teacher_schools_super_admin_all ON public.teacher_schools;
CREATE POLICY teacher_schools_super_admin_all ON public.teacher_schools
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS teacher_schools_school_access ON public.teacher_schools;
CREATE POLICY teacher_schools_school_access ON public.teacher_schools
  FOR ALL TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND (public.is_school_admin(school_id) OR public.is_preceptor(school_id))
  )
  WITH CHECK (
    school_id = public.get_user_school_id()
    AND public.is_school_admin(school_id)
  );

DROP POLICY IF EXISTS teacher_schools_view_own ON public.teacher_schools;
CREATE POLICY teacher_schools_view_own ON public.teacher_schools
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

-- 3. Update user_belongs_to_school to also check teacher_schools
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
    ) OR EXISTS(
      SELECT 1 FROM public.teacher_schools
      WHERE teacher_id = auth.uid() AND school_id = _school_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update profiles_school_admin_view_school policy
DROP POLICY IF EXISTS profiles_school_admin_view_school ON public.profiles;
CREATE POLICY profiles_school_admin_view_school ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (public.is_school_admin(profiles.school_id) OR public.is_preceptor(profiles.school_id) OR public.is_secretary(profiles.school_id))
    AND public.user_belongs_to_school(profiles.school_id)
  );

-- 5. Populate teacher_schools from existing profiles
INSERT INTO public.teacher_schools (teacher_id, school_id)
SELECT id, school_id FROM public.profiles
WHERE role = 'teacher' AND school_id IS NOT NULL
  AND id NOT IN (SELECT teacher_id FROM public.teacher_schools)
ON CONFLICT (teacher_id, school_id) DO NOTHING;

-- ============================================================================
-- Migration: 00014_add_teacher_schools
-- ============================================================================
