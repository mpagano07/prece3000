-- Agregar 'teacher' al enum user_role
ALTER TYPE public.user_role ADD VALUE 'teacher';
ALTER TYPE public.user_role ADD VALUE 'teacher_inactive';
