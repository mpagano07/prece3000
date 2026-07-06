-- Clean up duplicate attendance records before adding unique constraint
DELETE FROM public.attendance_log
WHERE attendance_id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY student_id, date, division_id ORDER BY updated_at DESC NULLS LAST, created_at DESC
    ) AS rn
    FROM public.attendance
  ) dup WHERE dup.rn > 1
);

DELETE FROM public.attendance
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY student_id, date, division_id ORDER BY updated_at DESC NULLS LAST, created_at DESC
    ) AS rn
    FROM public.attendance
  ) dup WHERE dup.rn > 1
);

-- Add unique constraint to enable proper upsert
ALTER TABLE public.attendance
ADD CONSTRAINT attendance_student_date_division_unique
UNIQUE (student_id, date, division_id);

-- Drop index that's now redundant with the unique constraint
DROP INDEX IF EXISTS idx_attendance_student_date;

-- Function: bulk upsert attendance records
CREATE OR REPLACE FUNCTION public.bulk_upsert_attendance(
  p_records JSONB,
  p_user_id UUID
) RETURNS SETOF public.attendance
LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO public.attendance (school_id, student_id, division_id, date, status, observation, created_by, updated_at)
  SELECT
    (r->>'school_id')::UUID,
    (r->>'student_id')::UUID,
    (r->>'division_id')::UUID,
    (r->>'date')::DATE,
    (r->>'status')::public.attendance_status,
    NULLIF(r->>'observation', ''),
    p_user_id,
    NOW()
  FROM JSONB_ARRAY_ELEMENTS(p_records) AS r
  ON CONFLICT (student_id, date, division_id) DO UPDATE SET
    status = EXCLUDED.status,
    observation = EXCLUDED.observation,
    updated_at = NOW()
  RETURNING *;
$$;
