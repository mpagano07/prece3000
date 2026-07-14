"use server"

import { db } from "@/lib/db"
import { documents } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { Document, DocumentType } from "@/types/database"
import { uploadToR2, deleteFromR2, getR2KeyFromUrl } from "@/lib/r2"

export async function getDocumentsByStudent(studentId: string): Promise<Document[]> {
  return db.query.documents.findMany({
    where: eq(documents.studentId, studentId),
    orderBy: (t, { desc }) => [desc(t.uploadedAt)],
  }) as Promise<Document[]>
}

export async function uploadDocument(
  schoolId: string,
  studentId: string,
  file: File,
  type: DocumentType,
  userId: string
): Promise<Document> {
  const ext = file.name.split(".").pop()
  const key = `student-documents/${schoolId}/${studentId}/${crypto.randomUUID()}.${ext}`
  const url = await uploadToR2(key, file)

  const rows = await db
    .insert(documents)
    .values({
      schoolId,
      studentId,
      name: file.name,
      type,
      fileUrl: url,
      uploadedBy: userId,
    })
    .returning()

  return rows[0] as Document
}

export async function deleteDocument(id: string, fileUrl: string): Promise<void> {
  await db.delete(documents).where(eq(documents.id, id))

  const key = getR2KeyFromUrl(fileUrl)
  if (key) {
    await deleteFromR2(key)
  }
}
