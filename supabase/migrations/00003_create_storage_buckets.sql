-- Create student-documents bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('student-documents', 'student-documents', true, false, 10485760, '{application/pdf,image/jpeg,image/png,image/webp}')
ON CONFLICT (id) DO NOTHING;

-- Storage policies for student-documents bucket
DROP POLICY IF EXISTS "student_documents_school_access_select" ON storage.objects;
DROP POLICY IF EXISTS "student_documents_school_access_insert" ON storage.objects;
DROP POLICY IF EXISTS "student_documents_school_access_delete" ON storage.objects;

CREATE POLICY "student_documents_school_access_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND (
      public.is_super_admin()
      OR (
        EXISTS (
          SELECT 1 FROM public.documents d
          WHERE d.file_url LIKE '%' || name
          AND d.school_id = public.get_user_school_id()
        )
      )
    )
  );

CREATE POLICY "student_documents_school_access_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'student-documents'
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );

CREATE POLICY "student_documents_school_access_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND (public.is_school_admin(public.get_user_school_id()) OR public.is_preceptor(public.get_user_school_id()))
  );
