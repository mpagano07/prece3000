-- Helper function: strip common Spanish accents from text
CREATE OR REPLACE FUNCTION public.normalize_text(text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT translate(
    $1,
    'áéíóúüñÁÉÍÓÚÜÑ',
    'aeiouunAEIOUUN'
  );
$$;

-- Function: accent-insensitive student search (uses translate, no extension needed)
CREATE OR REPLACE FUNCTION public.search_students(
  p_school_id UUID,
  p_query TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  school_id UUID,
  division_id UUID,
  first_name TEXT,
  last_name TEXT,
  dni TEXT,
  birth_date DATE,
  gender TEXT,
  nationality TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  blood_type TEXT,
  health_insurance TEXT,
  health_affiliate_number TEXT,
  doctor_name TEXT,
  doctor_phone TEXT,
  allergies TEXT,
  medication TEXT,
  restrictions TEXT,
  observations TEXT,
  status TEXT,
  academic_year_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  division_name TEXT,
  course_name TEXT
)
LANGUAGE sql STABLE AS $$
  SELECT
    s.id,
    s.school_id,
    s.division_id,
    s.first_name,
    s.last_name,
    s.dni,
    s.birth_date,
    s.gender,
    s.nationality,
    s.address,
    s.phone,
    s.email,
    s.photo_url,
    s.blood_type,
    s.health_insurance,
    s.health_affiliate_number,
    s.doctor_name,
    s.doctor_phone,
    s.allergies,
    s.medication,
    s.restrictions,
    s.observations,
    s.status,
    s.academic_year_id,
    s.created_at,
    s.updated_at,
    d.name AS division_name,
    c.name AS course_name
  FROM public.students s
  LEFT JOIN public.divisions d ON d.id = s.division_id
  LEFT JOIN public.courses c ON c.id = d.course_id
  WHERE s.school_id = p_school_id
    AND s.status = 'active'
    AND (
      public.normalize_text(s.first_name) ILIKE '%' || public.normalize_text(p_query) || '%'
      OR public.normalize_text(s.last_name) ILIKE '%' || public.normalize_text(p_query) || '%'
      OR s.dni ILIKE '%' || p_query || '%'
    )
  ORDER BY s.last_name ASC, s.first_name ASC
  LIMIT p_limit;
$$;
