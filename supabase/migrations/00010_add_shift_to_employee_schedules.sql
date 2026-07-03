-- ============================================================================
-- Add shift column to employee_schedules table
-- Migration: 00010_add_shift_to_employee_schedules.sql
-- ============================================================================

-- 1. Create shift type (safe if already exists)
DO $$ BEGIN
  CREATE TYPE public.employee_shift AS ENUM ('mañana', 'tarde', 'vespertino', 'nocturno');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add shift column (safe if already exists)
DO $$ BEGIN
  ALTER TABLE public.employee_schedules
    ADD COLUMN shift public.employee_shift;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 3. Set default shift for existing rows (mañana)
UPDATE public.employee_schedules SET shift = 'mañana' WHERE shift IS NULL;

-- 4. Make shift NOT NULL
ALTER TABLE public.employee_schedules
  ALTER COLUMN shift SET NOT NULL;

-- 5. Drop old unique constraint (safe if doesn't exist)
ALTER TABLE public.employee_schedules
  DROP CONSTRAINT IF EXISTS employee_schedules_employee_id_day_of_week_key;
ALTER TABLE public.employee_schedules
  DROP CONSTRAINT IF EXISTS employee_schedules_employee_id_day_of_week_shift_key;

-- 6. Add new unique constraint
ALTER TABLE public.employee_schedules
  ADD CONSTRAINT employee_schedules_emp_day_shift_key
  UNIQUE (employee_id, day_of_week, shift);

-- 7. Create index for shift
CREATE INDEX IF NOT EXISTS idx_employee_schedules_shift
  ON public.employee_schedules(shift);

-- ============================================================================
-- End of migration 00010
-- ============================================================================
