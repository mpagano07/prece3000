-- Ver todos los usuarios en la tabla auth (Better Auth)
SELECT id, name, email, "emailVerified", role FROM "user";

-- Ver todos los profiles
SELECT id, first_name, last_name, email, role, school_id FROM profiles;
