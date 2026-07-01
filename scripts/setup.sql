-- ============================================================
-- SCRIPT COMPLETO DE SETUP - Preceptor
-- ============================================================
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Crear usuario admin en auth.users
-- (requiere la extensión pgcrypto que ya viene habilitada)
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  confirmation_sent_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'matias.pagano07@gmail.com',
  crypt('Admin123!', gen_salt('bf')),
  NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(), NOW(),
  '', '', '', ''
);

-- 2. Crear la escuela demo
INSERT INTO schools (id, name, address, phone, email, active)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Escuela Demo',
  'Av. Siempre Viva 123',
  '011-1234-5678',
  'demo@escuela.com',
  true
);

-- 3. Asignar el perfil del admin (el trigger ya creó la fila en profiles)
UPDATE profiles
SET
  role = 'super_admin',
  first_name = 'Matías',
  last_name = 'Pagano',
  school_id = 'b0000000-0000-0000-0000-000000000001'
WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- 4. Año académico
INSERT INTO academic_years (id, school_id, name, start_date, end_date, active)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  '2026',
  '2026-03-01',
  '2026-12-18',
  true
);

-- 5. Cursos
INSERT INTO courses (id, school_id, name, academic_year_id) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '1° Año', 'c0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '2° Año', 'c0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', '3° Año', 'c0000000-0000-0000-0000-000000000001');

-- 6. Divisiones
INSERT INTO divisions (id, school_id, course_id, name, shift, academic_year_id) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'A', 'mañana', 'c0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'B', 'tarde', 'c0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'A', 'mañana', 'c0000000-0000-0000-0000-000000000001');

-- 7. Algunos alumnos de ejemplo
INSERT INTO students (id, school_id, division_id, first_name, last_name, dni, birth_date, gender, nationality, address, phone, email, status, academic_year_id) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Juan', 'Pérez', '45123456', '2010-05-12', 'male', 'Argentina', 'Calle Falsa 456', '011-9876-5432', 'juan.perez@ejemplo.com', 'active', 'c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'María', 'González', '46123457', '2010-08-22', 'female', 'Argentina', 'Av. Siempre Viva 789', '011-1122-3344', 'maria.g@ejemplo.com', 'active', 'c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Carlos', 'López', '47123458', '2010-01-15', 'male', 'Argentina', 'Belgrano 321', '011-5544-3322', 'carlos.l@ejemplo.com', 'active', 'c0000000-0000-0000-0000-000000000001');

-- 8. Responsables de los alumnos (usar gen_random_uuid() en vez de UUID fijos)
INSERT INTO student_guardians (student_id, name, phone, email, relationship) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'Laura Pérez', '011-9876-5432', 'laura.perez@ejemplo.com', 'mother'),
  ('f0000000-0000-0000-0000-000000000002', 'Pedro González', '011-1122-3344', 'pedro.g@ejemplo.com', 'father'),
  ('f0000000-0000-0000-0000-000000000003', 'Ana López', '011-5544-3322', 'ana.l@ejemplo.com', 'mother');

SELECT
  '✅ Usuario creado: matias.pagano07@gmail.com / Admin123!' AS resultado
UNION ALL
SELECT '✅ Escuela demo y datos de ejemplo insertados';

-- IMPORTANTE: Si el usuario ya existe en Auth (por ej. lo creaste desde el Dashboard),
-- comentá la primer INSERT (la de auth.users) y ejecutá solo el UPDATE de profiles.
-- Reemplazá el id en el WHERE por el id real del usuario en auth.users.
