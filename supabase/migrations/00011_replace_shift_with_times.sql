-- ============================================================================
-- Replace shift enum with time_start / time_end in employee_schedules
-- Migration: 00011_replace_shift_with_times.sql
-- ============================================================================

-- 1. Add time columns
ALTER TABLE public.employee_schedules
  ADD COLUMN time_start TIME;
ALTER TABLE public.employee_schedules
  ADD COLUMN time_end TIME;

-- 2. Migrate existing shift values to time ranges
UPDATE public.employee_schedules SET
  time_start = CASE shift
    WHEN 'mañana' THEN '08:00'::TIME
    WHEN 'tarde' THEN '14:00'::TIME
    WHEN 'vespertino' THEN '18:00'::TIME
    WHEN 'nocturno' THEN '22:00'::TIME
  END,
  time_end = CASE shift
    WHEN 'mañana' THEN '12:00'::TIME
    WHEN 'tarde' THEN '18:00'::TIME
    WHEN 'vespertino' THEN '22:00'::TIME
    WHEN 'nocturno' THEN '06:00'::TIME
  END;

-- 3. Make time columns NOT NULL
ALTER TABLE public.employee_schedules
  ALTER COLUMN time_start SET NOT NULL;
ALTER TABLE public.employee_schedules
  ALTER COLUMN time_end SET NOT NULL;

-- 4. Drop shift column and its index
DROP INDEX IF EXISTS idx_employee_schedules_shift;
ALTER TABLE public.employee_schedules
  DROP COLUMN shift;

-- 5. Drop old unique constraint (any previous name)
ALTER TABLE public.employee_schedules
  DROP CONSTRAINT IF EXISTS employee_schedules_emp_day_shift_key;
ALTER TABLE public.employee_schedules
  DROP CONSTRAINT IF EXISTS employee_schedules_employee_id_day_of_week_key;

-- 6. Add new unique constraint
ALTER TABLE public.employee_schedules
  ADD CONSTRAINT employee_schedules_emp_day_time_key
  UNIQUE (employee_id, day_of_week, time_start);

-- 7. Index on time columns
CREATE INDEX IF NOT EXISTS idx_employee_schedules_time_start
  ON public.employee_schedules(time_start);

-- ============================================================================
-- End of migration 00011
-- ============================================================================
