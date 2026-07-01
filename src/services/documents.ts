import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Document, DocumentType } from "@/types/database"

export class DocumentService {
  static async getByStudent(
    supabase: SupabaseClient,
    studentId: string
  ): Promise<Document[]> {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("student_id", studentId)
      .order("uploaded_at", { ascending: false })

    if (error) throw new Error(`Error fetching documents: ${error.message}`)
    return data ?? []
  }

  static async upload(
    supabase: SupabaseClient,
    schoolId: string,
    studentId: string,
    file: File,
    type: DocumentType,
    userId: string
  ): Promise<Document> {
    const ext = file.name.split(".").pop()
    const filePath = `${schoolId}/${studentId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("student-documents")
      .upload(filePath, file)

    if (uploadError) throw new Error(`Error uploading document: ${uploadError.message}`)

    const { data: urlData } = supabase.storage
      .from("student-documents")
      .getPublicUrl(filePath)

    const { data: document, error: dbError } = await supabase
      .from("documents")
      .insert({
        school_id: schoolId,
        student_id: studentId,
        name: file.name,
        type,
        file_url: urlData.publicUrl,
        uploaded_by: userId,
      })
      .select()
      .single()

    if (dbError) {
      await supabase.storage.from("student-documents").remove([filePath])
      throw new Error(`Error saving document record: ${dbError.message}`)
    }

    return document
  }

  static async delete(
    supabase: SupabaseClient,
    id: string,
    fileUrl: string
  ): Promise<void> {
    const { error: dbError } = await supabase.from("documents").delete().eq("id", id)

    if (dbError) throw new Error(`Error deleting document record: ${dbError.message}`)

    const filePath = fileUrl.split("/").slice(-3).join("/")
    const { error: storageError } = await supabase.storage
      .from("student-documents")
      .remove([filePath])

    if (storageError) throw new Error(`Error deleting file from storage: ${storageError.message}`)
  }
}

let cachedSchoolId: string | null = null
let cachedUserId: string | null = null

async function ensureContext(client = createClient()) {
  if (!cachedUserId) {
    const { data: { user } } = await client.auth.getUser()
    if (!user) throw new Error("Not authenticated")
    cachedUserId = user.id
  }
  if (!cachedSchoolId) {
    const { data: profile } = await client
      .from("profiles")
      .select("school_id")
      .eq("id", cachedUserId)
      .maybeSingle()
    if (!profile?.school_id) throw new Error("Profile has no associated school")
    cachedSchoolId = profile.school_id
  }
  return { supabase: client, userId: cachedUserId, schoolId: cachedSchoolId! }
}

export const documentService = {
  async getStudentDocuments(studentId: string) {
    const { supabase } = await ensureContext()
    return DocumentService.getByStudent(supabase, studentId)
  },
  async upload(data: Omit<Document, "id" | "uploaded_at" | "uploaded_by"> & { file?: File }) {
    const { supabase, schoolId, userId } = await ensureContext()
    if (!data.file) throw new Error("File is required")
    return DocumentService.upload(
      supabase,
      schoolId,
      data.student_id,
      data.file,
      data.type as DocumentType,
      userId
    )
  },
  async delete(documentId: string) {
    const { supabase } = await ensureContext()
    const { data: doc } = await supabase
      .from("documents")
      .select("file_url")
      .eq("id", documentId)
      .single()

    if (!doc) throw new Error("Document not found")

    return DocumentService.delete(supabase, documentId, doc.file_url)
  },
}
