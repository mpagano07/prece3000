-- ============================================================================
-- Add director role to user_role enum and update permission functions
-- Migration: 00004_add_director_role.sql
-- ============================================================================

-- Add director to user_role enum
ALTER TYPE public.user_role ADD VALUE 'director';

-- Update is_school_admin to also recognize director role
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

-- ============================================================================
-- Migration: 00004_add_director_role
-- ============================================================================
