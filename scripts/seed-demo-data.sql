-- ============================================================
-- SEED: Datos de demostración
-- Crea 2 cursos, 4 divisiones y ~120 alumnos (30 por división)
-- Ejecutar en Supabase SQL Editor después de aplicar fix-rls-ambiguity.sql
-- ============================================================

DO $$
DECLARE
  v_school_id UUID;
  v_academic_year_id UUID;

  v_course1_id UUID;
  v_course2_id UUID;

  v_div1a_id UUID;
  v_div1b_id UUID;
  v_div2a_id UUID;
  v_div2b_id UUID;

  first_names TEXT[] := ARRAY[
    'Mateo','Sofía','Benjamín','Valentina','Lautaro','Catalina',
    'Thiago','Isabella','Santino','Emilia','Bautista','Martina',
    'Facundo','Luciana','Joaquín','Camila','Ignacio','Julieta',
    'Lorenzo','Mía','Tomás','Victoria','Franco','Renata',
    'Bruno','Josefina','Nicolás','Abril','Augusto','Guadalupe',
    'Felipe','Lara','Emiliano','Morena','Ciro','Candelaria',
    'Juan','Lola','Maximiliano','Zoe','Gael','Ambar',
    'Simón','Malena','Francisco','Olivia','Valentino','Alma',
    'Sebastián','Clara','Ramiro','Emma','Lucas','Pilar',
    'Julián','Elena','Ian','Antonella','Benicio','Malena'
  ];

  last_names TEXT[] := ARRAY[
    'González','Rodríguez','López','Martínez','García','Fernández',
    'Pérez','Sánchez','Romero','Díaz','Torres','Álvarez',
    'Ruiz','Ramírez','Flores','Acosta','Medina','Silva',
    'Ortiz','Castro','Rojas','Suárez','Morales','Cáceres',
    'Pereyra','Núñez','Correa','Godoy','Mendoza','Vega',
    'Sosa','Ávila','Moreno','Vázquez','Giménez','Arias',
    'Herrera','Ríos','Navarro','Rivas','Cruz','Luna',
    'Benítez','Roldán','Campos','Castillo','Villalba','Ponce',
    'Burgos','Aguirre','Bravo','Duarte','Páez','Escobar',
    'Rey','Méndez','Santos','Vargas','Paz','Cabrera'
  ];

  division_ids UUID[];
  v_div_id UUID;
  v_dni_base INTEGER := 40000000;
  v_idx INTEGER;
  s INTEGER;
BEGIN
  -- 1. Encontrar la primera escuela
  SELECT id INTO v_school_id FROM public.schools ORDER BY created_at ASC LIMIT 1;
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'No hay escuelas. Ejecute seed.sql o setup.sql primero.';
  END IF;

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

  IF v_academic_year_id IS NULL THEN
    RAISE EXCEPTION 'No hay años académicos para la escuela. Cree uno primero.';
  END IF;

  RAISE NOTICE 'Escuela: %, Año académico: %', v_school_id, v_academic_year_id;

  -- 3. Crear cursos (si no existen)
  SELECT id INTO v_course1_id FROM public.courses
  WHERE school_id = v_school_id AND academic_year_id = v_academic_year_id AND name = '1° Año';

  IF v_course1_id IS NULL THEN
    v_course1_id := gen_random_uuid();
    INSERT INTO public.courses (id, school_id, name, academic_year_id)
    VALUES (v_course1_id, v_school_id, '1° Año', v_academic_year_id);
    RAISE NOTICE 'Curso creado: 1° Año';
  ELSE
    RAISE NOTICE 'Curso existente: 1° Año';
  END IF;

  SELECT id INTO v_course2_id FROM public.courses
  WHERE school_id = v_school_id AND academic_year_id = v_academic_year_id AND name = '2° Año';

  IF v_course2_id IS NULL THEN
    v_course2_id := gen_random_uuid();
    INSERT INTO public.courses (id, school_id, name, academic_year_id)
    VALUES (v_course2_id, v_school_id, '2° Año', v_academic_year_id);
    RAISE NOTICE 'Curso creado: 2° Año';
  ELSE
    RAISE NOTICE 'Curso existente: 2° Año';
  END IF;

  -- 4. Crear divisiones (si no existen)
  SELECT id INTO v_div1a_id FROM public.divisions
  WHERE school_id = v_school_id AND course_id = v_course1_id AND name = '1° División';

  IF v_div1a_id IS NULL THEN
    v_div1a_id := gen_random_uuid();
    INSERT INTO public.divisions (id, school_id, course_id, name, shift, academic_year_id)
    VALUES (v_div1a_id, v_school_id, v_course1_id, '1° División', 'mañana', v_academic_year_id);
  END IF;

  SELECT id INTO v_div1b_id FROM public.divisions
  WHERE school_id = v_school_id AND course_id = v_course1_id AND name = '2° División';

  IF v_div1b_id IS NULL THEN
    v_div1b_id := gen_random_uuid();
    INSERT INTO public.divisions (id, school_id, course_id, name, shift, academic_year_id)
    VALUES (v_div1b_id, v_school_id, v_course1_id, '2° División', 'tarde', v_academic_year_id);
  END IF;

  SELECT id INTO v_div2a_id FROM public.divisions
  WHERE school_id = v_school_id AND course_id = v_course2_id AND name = '1° División';

  IF v_div2a_id IS NULL THEN
    v_div2a_id := gen_random_uuid();
    INSERT INTO public.divisions (id, school_id, course_id, name, shift, academic_year_id)
    VALUES (v_div2a_id, v_school_id, v_course2_id, '1° División', 'mañana', v_academic_year_id);
  END IF;

  SELECT id INTO v_div2b_id FROM public.divisions
  WHERE school_id = v_school_id AND course_id = v_course2_id AND name = '2° División';

  IF v_div2b_id IS NULL THEN
    v_div2b_id := gen_random_uuid();
    INSERT INTO public.divisions (id, school_id, course_id, name, shift, academic_year_id)
    VALUES (v_div2b_id, v_school_id, v_course2_id, '2° División', 'tarde', v_academic_year_id);
  END IF;

  division_ids := ARRAY[v_div1a_id, v_div1b_id, v_div2a_id, v_div2b_id];

  -- 5. Crear alumnos (30 por división = 120)
  v_idx := 0;
  FOREACH v_div_id IN ARRAY division_ids LOOP
    FOR s IN 1..30 LOOP
      INSERT INTO public.students (
        school_id, division_id, first_name, last_name, dni, status
      ) VALUES (
        v_school_id,
        v_div_id,
        first_names[1 + ((v_idx * 7 + s * 3) % array_length(first_names, 1))],
        last_names[1 + ((v_idx * 11 + s * 5) % array_length(last_names, 1))],
        (v_dni_base + v_idx * 30 + s)::TEXT,
        'active'
      )
      ON CONFLICT (dni) DO NOTHING;
    END LOOP;
    v_idx := v_idx + 1;
  END LOOP;

  -- 6. Mostrar resumen
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Datos de demostración creados/verificados:';
  RAISE NOTICE 'Cursos: 1° Año, 2° Año';
  RAISE NOTICE 'Divisiones: 1° Año - 1° Div (mañana), 1° Año - 2° Div (tarde)';
  RAISE NOTICE '            2° Año - 1° Div (mañana), 2° Año - 2° Div (tarde)';
  RAISE NOTICE 'Alumnos: ~120 (30 por división)';
  RAISE NOTICE '----------------------------------------';
END $$;
