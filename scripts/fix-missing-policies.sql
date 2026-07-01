-- ============================================================
-- FIX: Recrear políticas que CASCADE eliminó y no se rehicieron
-- ============================================================

-- SCHOOLS
DROP POLICY IF EXISTS schools_super_admin_all ON public.schools;
DROP POLICY IF EXISTS schools_school_admin_view ON public.schools;

CREATE POLICY schools_super_admin_all ON public.schools
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY schools_school_admin_view ON public.schools
  FOR SELECT TO authenticated
  USING (id = public.get_user_school_id());

-- PROFILES
DROP POLICY IF EXISTS profiles_view_own ON public.profiles;
DROP POLICY IF EXISTS profiles_super_admin_all ON public.profiles;
DROP POLICY IF EXISTS profiles_school_admin_view_school ON public.profiles;

CREATE POLICY profiles_view_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_super_admin_all ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY profiles_school_admin_view_school ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (public.is_school_admin(profiles.school_id) OR public.is_preceptor(profiles.school_id) OR public.is_secretary(profiles.school_id))
    AND profiles.school_id = public.get_user_school_id()
  );

-- AUDIT LOG
DROP POLICY IF EXISTS audit_log_super_admin_all ON public.audit_log;
DROP POLICY IF EXISTS audit_log_view_school ON public.audit_log;

CREATE POLICY audit_log_super_admin_all ON public.audit_log
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY audit_log_view_school ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND public.is_school_admin(school_id)
  );

-- STORAGE: student-photos bucket
DROP POLICY IF EXISTS student_photos_super_admin_all ON storage.objects;
DROP POLICY IF EXISTS student_photos_school_access_insert ON storage.objects;
DROP POLICY IF EXISTS student_photos_school_access_delete ON storage.objects;

CREATE POLICY student_photos_super_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'student-photos' AND public.is_super_admin())
  WITH CHECK (bucket_id = 'student-photos' AND public.is_super_admin());

CREATE POLICY student_photos_school_access_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-photos'
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

CREATE POLICY student_photos_school_access_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'student-photos'
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

-- STORAGE: documents bucket
DROP POLICY IF EXISTS documents_super_admin_all ON storage.objects;
DROP POLICY IF EXISTS documents_school_access_insert ON storage.objects;
DROP POLICY IF EXISTS documents_school_access_delete ON storage.objects;

CREATE POLICY documents_super_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'documents' AND public.is_super_admin())
  WITH CHECK (bucket_id = 'documents' AND public.is_super_admin());

CREATE POLICY documents_school_access_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

CREATE POLICY documents_school_access_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

SELECT '✅ Políticas faltantes recreadas correctamente' AS resultado;
