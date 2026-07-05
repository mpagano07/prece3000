-- ============================================================================
-- Create grades table for student subject grades
-- Each student+subject has: partial_1, final_1 (Q1) and partial_2, final_2 (Q2)
-- Migration: 00015_grades.sql
-- ============================================================================

-- 1. Drop existing table if we're re-applying (safe re-run)
DROP TABLE IF EXISTS public.grades CASCADE;

-- 2. Create grades table
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  -- First quarter
  partial_1 TEXT CHECK (partial_1 IN ('TEA', 'TEP', 'TED') OR partial_1 IS NULL),
  final_1 DECIMAL(4,2) CHECK (final_1 >= 0 AND final_1 <= 10),
  -- Second quarter
  partial_2 TEXT CHECK (partial_2 IN ('TEA', 'TEP', 'TED') OR partial_2 IS NULL),
  final_2 DECIMAL(4,2) CHECK (final_2 >= 0 AND final_2 <= 10),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT grades_student_subject_key UNIQUE(student_id, subject_id, division_id, academic_year_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_grades_school_id ON public.grades(school_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON public.grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject_id ON public.grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_division_id ON public.grades(division_id);

-- 4. Enable RLS
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies
-- All authenticated users who belong to the school can VIEW grades
DROP POLICY IF EXISTS grades_select ON public.grades;
CREATE POLICY grades_select ON public.grades
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_school(school_id)
  );

-- Only teachers (and super_admin) can INSERT/UPDATE grades
DROP POLICY IF EXISTS grades_insert ON public.grades;
CREATE POLICY grades_insert ON public.grades
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_belongs_to_school(school_id)
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'teacher'
      )
    )
  );

DROP POLICY IF EXISTS grades_update ON public.grades;
CREATE POLICY grades_update ON public.grades
  FOR UPDATE TO authenticated
  USING (
    public.user_belongs_to_school(school_id)
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'teacher'
      )
    )
  )
  WITH CHECK (
    public.user_belongs_to_school(school_id)
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'teacher'
      )
    )
  );

-- ============================================================================
-- Migration: 00015_grades
-- ============================================================================
