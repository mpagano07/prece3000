-- ============================================================
-- SCRIPT: Agregar ~30 alumnos a la escuela existente
-- Crea cursos y divisiones nuevos (si no existen) y distribuye
-- los alumnos entre ellos. Ejecutar en Neon SQL Editor.
-- ============================================================

DO $$
DECLARE
  v_school_id UUID;
  v_academic_year_id UUID;

  v_course1_id UUID;
  v_course2_id UUID;
  v_course3_id UUID;

  v_div1a_id UUID;
  v_div1b_id UUID;
  v_div2a_id UUID;
  v_div3a_id UUID;

  v_total_students INTEGER := 30;
  v_per_division INTEGER;
  v_remainder INTEGER;
  v_counter INTEGER := 0;

  -- Nombres argentinos realistas
  first_names TEXT[] := ARRAY[
    'Mateo','Sofía','Benjamín','Valentina','Lautaro','Catalina',
    'Thiago','Isabella','Santino','Emilia','Bautista','Martina',
    'Facundo','Luciana','Joaquín','Camila','Ignacio','Julieta',
    'Lorenzo','Mía','Tomás','Victoria','Franco','Renata',
    'Bruno','Josefina','Nicolás','Abril','Augusto','Guadalupe'
  ];

  last_names TEXT[] := ARRAY[
    'González','Rodríguez','López','Martínez','García','Fernández',
    'Pérez','Sánchez','Romero','Díaz','Torres','Álvarez',
    'Ruiz','Ramírez','Flores','Acosta','Medina','Silva',
    'Ortiz','Castro','Rojas','Suárez','Morales','Cáceres',
    'Pereyra','Núñez','Correa','Godoy','Mendoza','Vega'
  ];

  division_ids UUID[];
  v_div_id UUID;
  v_dni_base INTEGER := 42000000;
  s INTEGER;
BEGIN
  -- 1. Encontrar la primera escuela activa
  SELECT id INTO v_school_id
  FROM public.schools
  WHERE active = TRUE
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'No hay escuelas activas. Cree una escuela primero.';
  END IF;

  RAISE NOTICE 'Escuela encontrada: %', v_school_id;

  -- 2. Encontrar año académico activo (o el último)
  SELECT id INTO v_academic_year_id
  FROM public.academic_years
  WHERE school_id = v_school_id AND active = TRUE
  LIMIT 1;

  IF v_academic_year_id IS NULL THEN
    SELECT id INTO v_academic_year_id
    FROM public.academic_years
    WHERE school_id = v_school_id
    ORDER BY start_date DESC
    LIMIT 1;
  END IF;

  -- Si no hay año académico, crear uno para 2026
  IF v_academic_year_id IS NULL THEN
    v_academic_year_id := gen_random_uuid();
    INSERT INTO public.academic_years (id, school_id, name, start_date, end_date, active)
    VALUES (
      v_academic_year_id,
      v_school_id,
      '2026',
      '2026-03-01',
      '2026-12-18',
      TRUE
    );
    RAISE NOTICE 'Año académico creado: 2026 (id: %)', v_academic_year_id;
  ELSE
    RAISE NOTICE 'Año académico existente encontrado: %', v_academic_year_id;
  END IF;

  -- 3. Crear cursos (si no existen)
  -- 1° Año
  SELECT id INTO v_course1_id FROM public.courses
  WHERE school_id = v_school_id AND academic_year_id = v_academic_year_id AND name = '1° Año';
  IF v_course1_id IS NULL THEN
    v_course1_id := gen_random_uuid();
    INSERT INTO public.courses (id, school_id, name, academic_year_id)
    VALUES (v_course1_id, v_school_id, '1° Año', v_academic_year_id);
    RAISE NOTICE 'Curso creado: 1° Año';
  END IF;

  -- 2° Año
  SELECT id INTO v_course2_id FROM public.courses
  WHERE school_id = v_school_id AND academic_year_id = v_academic_year_id AND name = '2° Año';
  IF v_course2_id IS NULL THEN
    v_course2_id := gen_random_uuid();
    INSERT INTO public.courses (id, school_id, name, academic_year_id)
    VALUES (v_course2_id, v_school_id, '2° Año', v_academic_year_id);
    RAISE NOTICE 'Curso creado: 2° Año';
  END IF;

  -- 3° Año
  SELECT id INTO v_course3_id FROM public.courses
  WHERE school_id = v_school_id AND academic_year_id = v_academic_year_id AND name = '3° Año';
  IF v_course3_id IS NULL THEN
    v_course3_id := gen_random_uuid();
    INSERT INTO public.courses (id, school_id, name, academic_year_id)
    VALUES (v_course3_id, v_school_id, '3° Año', v_academic_year_id);
    RAISE NOTICE 'Curso creado: 3° Año';
  END IF;

  -- 4. Crear divisiones nuevas (si no existen)
  -- 1° Año - 1° División (mañana)
  SELECT id INTO v_div1a_id FROM public.divisions
  WHERE school_id = v_school_id AND course_id = v_course1_id AND name = '1° División';
  IF v_div1a_id IS NULL THEN
    v_div1a_id := gen_random_uuid();
    INSERT INTO public.divisions (id, school_id, course_id, name, shift, academic_year_id)
    VALUES (v_div1a_id, v_school_id, v_course1_id, '1° División', 'mañana', v_academic_year_id);
    RAISE NOTICE 'División creada: 1° Año - 1° Div (mañana)';
  END IF;

  -- 2° Año - 1° División (mañana)
  SELECT id INTO v_div2a_id FROM public.divisions
  WHERE school_id = v_school_id AND course_id = v_course2_id AND name = '1° División';
  IF v_div2a_id IS NULL THEN
    v_div2a_id := gen_random_uuid();
    INSERT INTO public.divisions (id, school_id, course_id, name, shift, academic_year_id)
    VALUES (v_div2a_id, v_school_id, v_course2_id, '1° División', 'mañana', v_academic_year_id);
    RAISE NOTICE 'División creada: 2° Año - 1° Div (mañana)';
  END IF;

  -- 3° Año - 1° División (mañana)
  SELECT id INTO v_div3a_id FROM public.divisions
  WHERE school_id = v_school_id AND course_id = v_course3_id AND name = '1° División';
  IF v_div3a_id IS NULL THEN
    v_div3a_id := gen_random_uuid();
    INSERT INTO public.divisions (id, school_id, course_id, name, shift, academic_year_id)
    VALUES (v_div3a_id, v_school_id, v_course3_id, '1° División', 'mañana', v_academic_year_id);
    RAISE NOTICE 'División creada: 3° Año - 1° Div (mañana)';
  END IF;

  -- 5. Distribuir 30 alumnos entre 3 divisiones (10 por división)
  division_ids := ARRAY[v_div1a_id, v_div2a_id, v_div3a_id];
  v_per_division := v_total_students / array_length(division_ids, 1);  -- 10
  v_remainder := v_total_students % array_length(division_ids, 1);    -- 0

  v_counter := 0;
  FOREACH v_div_id IN ARRAY division_ids LOOP
    FOR s IN 1..v_per_division LOOP
      INSERT INTO public.students (
        school_id, division_id, first_name, last_name, dni, status,
        gender, nationality, academic_year_id
      ) VALUES (
        v_school_id,
        v_div_id,
        first_names[1 + ((v_counter * 7 + s * 3) % array_length(first_names, 1))],
        last_names[1 + ((v_counter * 11 + s * 5) % array_length(last_names, 1))],
        (v_dni_base + v_counter * 10 + s)::TEXT,
        'active',
        CASE WHEN (v_counter + s) % 2 = 0 THEN 'M' ELSE 'F' END,
        'Argentina',
        v_academic_year_id
      )
      ON CONFLICT (dni) DO NOTHING;
      v_counter := v_counter + 1;
    END LOOP;
  END LOOP;

  -- 6. Resumen
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Proceso completado:';
  RAISE NOTICE 'Escuela ID: %', v_school_id;
  RAISE NOTICE 'Año académico ID: %', v_academic_year_id;
  RAISE NOTICE 'Cursos: 1° Año, 2° Año, 3° Año';
  RAISE NOTICE 'Divisiones: 1° Div (mañana) en cada curso';
  RAISE NOTICE 'Alumnos insertados: ~30 (10 por división)';
  RAISE NOTICE '----------------------------------------';
END $$;
