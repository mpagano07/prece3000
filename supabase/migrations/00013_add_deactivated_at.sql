-- Add deactivated_at column to profiles for soft-delete (teacher/school-level deactivation)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;
