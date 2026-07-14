"use server"

import { db } from "@/lib/db"
import { preceptorBook } from "@/lib/db/schema"
import { eq, and, gte, lte } from "drizzle-orm"
import type { PreceptorBookEntry, BookEntryType } from "@/types/database"

export async function getAllBookEntries(
  schoolId: string,
  filters?: {
    type?: BookEntryType
    studentId?: string
    startDate?: string
    endDate?: string
  }
): Promise<PreceptorBookEntry[]> {
  const conditions = [eq(preceptorBook.schoolId, schoolId)]

  if (filters?.type) conditions.push(eq(preceptorBook.type, filters.type))
  if (filters?.studentId) conditions.push(eq(preceptorBook.studentId, filters.studentId))
  if (filters?.startDate) conditions.push(gte(preceptorBook.createdAt, new Date(filters.startDate)))
  if (filters?.endDate) conditions.push(lte(preceptorBook.createdAt, new Date(filters.endDate)))

  return db.query.preceptorBook.findMany({
    where: and(...conditions),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  }) as Promise<PreceptorBookEntry[]>
}

export async function createBookEntry(
  schoolId: string,
  data: {
    type: BookEntryType
    title: string
    description: string
    studentId?: string
  },
  userId: string
): Promise<PreceptorBookEntry> {
  const rows = await db
    .insert(preceptorBook)
    .values({
      schoolId,
      type: data.type,
      title: data.title,
      description: data.description,
      studentId: data.studentId ?? null,
      createdBy: userId,
    })
    .returning()

  return rows[0] as PreceptorBookEntry
}

export async function getBookEntryById(id: string): Promise<PreceptorBookEntry | null> {
  return db.query.preceptorBook.findFirst({
    where: eq(preceptorBook.id, id),
  }) as Promise<PreceptorBookEntry | null>
}

export async function deleteBookEntry(id: string): Promise<void> {
  await db.delete(preceptorBook).where(eq(preceptorBook.id, id))
}

export async function getStudentBookEntries(studentId: string): Promise<PreceptorBookEntry[]> {
  return db.query.preceptorBook.findMany({
    where: eq(preceptorBook.studentId, studentId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  }) as Promise<PreceptorBookEntry[]>
}
