"use server"

import { db } from "@/lib/db"
import {
  students,
  studentGuardians,
  authorizedPersons,
  attendance,
  preceptorBook,
  communications,
  documents,
  subjects,
  teacherAssignments,
  divisions,
} from "@/lib/db/schema"
import { eq, and, or, ilike, asc, desc, sql } from "drizzle-orm"
import type {
  Student,
  StudentGuardian,
  AuthorizedPerson,
  Attendance,
  PreceptorBookEntry,
  Communication,
  Document,
} from "@/types/database"
import { uploadToR2 } from "@/lib/r2"

export async function getAllStudents(
  schoolId: string,
  divisionId?: string,
  academicYearId?: string
): Promise<Student[]> {
  const conditions = [eq(students.schoolId, schoolId), eq(students.status, "active")]
  if (divisionId) conditions.push(eq(students.divisionId, divisionId))
  if (academicYearId) conditions.push(eq(students.academicYearId, academicYearId))

  return db.query.students.findMany({
    where: and(...conditions),
    orderBy: (t, { asc: a }) => [a(t.lastName), a(t.firstName)],
  }) as Promise<Student[]>
}

export async function getStudentById(id: string): Promise<Student | null> {
  return db.query.students.findFirst({
    where: eq(students.id, id),
  }) as Promise<Student | null>
}

export async function createStudent(data: {
  schoolId: string
  divisionId?: string | null
  firstName: string
  lastName: string
  dni: string
  birthDate?: string | null
  gender?: string | null
  nationality?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  photoUrl?: string | null
  bloodType?: string | null
  healthInsurance?: string | null
  healthAffiliateNumber?: string | null
  doctorName?: string | null
  doctorPhone?: string | null
  allergies?: string | null
  medication?: string | null
  restrictions?: string | null
  observations?: string | null
  academicYearId?: string | null
  guardians?: Omit<StudentGuardian, "id" | "studentId">[]
  authorizedPersons?: Omit<AuthorizedPerson, "id" | "studentId">[]
}): Promise<Student> {
  const { guardians, authorizedPersons: authPersons, ...studentData } = data

  const cleaned = Object.fromEntries(
    Object.entries(studentData).map(([key, val]) => [key, val === "" ? null : val])
  )

  const rows = await db
    .insert(students)
    .values({ ...cleaned, status: "active" } as typeof students.$inferInsert)
    .returning()

  const student = rows[0] as Student

  if (guardians && guardians.length > 0) {
    await db.insert(studentGuardians).values(
      guardians.map((g) => ({ ...g, studentId: student.id }))
    )
  }

  if (authPersons && authPersons.length > 0) {
    await db.insert(authorizedPersons).values(
      authPersons.map((p) => ({ ...p, studentId: student.id }))
    )
  }

  return student
}

export async function updateStudent(
  id: string,
  data: Partial<Omit<Student, "id" | "createdAt" | "updatedAt">> & {
    guardians?: Omit<StudentGuardian, "id" | "studentId">[]
    authorizedPersons?: Omit<AuthorizedPerson, "id" | "studentId">[]
  }
): Promise<Student> {
  const { guardians, authorizedPersons: authPersons, ...studentData } = data

  const cleaned = Object.fromEntries(
    Object.entries(studentData).map(([key, val]) => [key, val === "" ? null : val])
  )

  const rows = await db
    .update(students)
    .set(cleaned)
    .where(eq(students.id, id))
    .returning()

  const student = rows[0] as Student

  if (guardians !== undefined) {
    await db.delete(studentGuardians).where(eq(studentGuardians.studentId, id))
    if (guardians.length > 0) {
      await db.insert(studentGuardians).values(
        guardians.map((g) => ({ ...g, studentId: id }))
      )
    }
  }

  if (authPersons !== undefined) {
    await db.delete(authorizedPersons).where(eq(authorizedPersons.studentId, id))
    if (authPersons.length > 0) {
      await db.insert(authorizedPersons).values(
        authPersons.map((p) => ({ ...p, studentId: id }))
      )
    }
  }

  return student
}

export async function deleteStudent(id: string): Promise<void> {
  await db.update(students).set({ status: "inactive" }).where(eq(students.id, id))
}

export async function getGuardians(studentId: string): Promise<StudentGuardian[]> {
  return db.query.studentGuardians.findMany({
    where: eq(studentGuardians.studentId, studentId),
    orderBy: (t, { asc }) => [asc(t.name)],
  }) as Promise<StudentGuardian[]>
}

export async function addGuardian(
  studentId: string,
  data: Omit<StudentGuardian, "id" | "studentId">
): Promise<StudentGuardian> {
  const rows = await db
    .insert(studentGuardians)
    .values({ ...data, studentId })
    .returning()
  return rows[0] as StudentGuardian
}

export async function removeGuardian(id: string): Promise<void> {
  await db.delete(studentGuardians).where(eq(studentGuardians.id, id))
}

export async function getAuthorizedPersons(studentId: string): Promise<AuthorizedPerson[]> {
  return db.query.authorizedPersons.findMany({
    where: eq(authorizedPersons.studentId, studentId),
    orderBy: (t, { asc }) => [asc(t.name)],
  }) as Promise<AuthorizedPerson[]>
}

export async function addAuthorizedPerson(
  studentId: string,
  data: Omit<AuthorizedPerson, "id" | "studentId">
): Promise<AuthorizedPerson> {
  const rows = await db
    .insert(authorizedPersons)
    .values({ ...data, studentId })
    .returning()
  return rows[0] as AuthorizedPerson
}

export async function removeAuthorizedPerson(id: string): Promise<void> {
  await db.delete(authorizedPersons).where(eq(authorizedPersons.id, id))
}

export async function getStudentHistory(studentId: string) {
  const [att, book, comm, docs] = await Promise.all([
    db.query.attendance.findMany({
      where: eq(attendance.studentId, studentId),
      orderBy: (t, { desc: d }) => [d(t.date), d(t.createdAt)],
    }),
    db.query.preceptorBook.findMany({
      where: eq(preceptorBook.studentId, studentId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    }),
    db.query.communications.findMany({
      where: eq(communications.studentId, studentId),
      orderBy: (t, { desc }) => [desc(t.sentAt)],
    }),
    db.query.documents.findMany({
      where: eq(documents.studentId, studentId),
      orderBy: (t, { desc }) => [desc(t.uploadedAt)],
    }),
  ])

  return {
    attendance: att as Attendance[],
    bookEntries: book as PreceptorBookEntry[],
    communications: comm as Communication[],
    documents: docs as Document[],
  }
}

export async function uploadPhoto(
  studentId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop()
  const key = `student-photos/${studentId}/${crypto.randomUUID()}.${ext}`
  const url = await uploadToR2(key, file)

  const rows = await db
    .update(students)
    .set({ photoUrl: url })
    .where(eq(students.id, studentId))
    .returning()

  return url
}

export async function getStudentPage(
  schoolId: string,
  page: number,
  pageSize: number,
  filters?: { divisionId?: string; divisionIds?: string[] },
  academicYearId?: string
): Promise<{ data: Student[]; total: number }> {
  const conditions = [eq(students.schoolId, schoolId), eq(students.status, "active")]
  if (filters?.divisionId) conditions.push(eq(students.divisionId, filters.divisionId))
  if (academicYearId) conditions.push(eq(students.academicYearId, academicYearId))

  const offset = page * pageSize

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(students)
    .where(and(...conditions))

  const data = await db.query.students.findMany({
    where: and(...conditions),
    orderBy: (t, { asc }) => [asc(t.lastName), asc(t.firstName)],
    limit: pageSize,
    offset,
  })

  return { data: data as Student[], total: totalRow?.count ?? 0 }
}

export async function searchStudents(
  schoolId: string,
  query: string
): Promise<Student[]> {
  const searchTerm = `%${query}%`
  return db.query.students.findMany({
    where: and(
      eq(students.schoolId, schoolId),
      eq(students.status, "active"),
      or(
        ilike(students.firstName, searchTerm),
        ilike(students.lastName, searchTerm),
        ilike(students.dni, searchTerm)
      )
    ),
    orderBy: (t, { asc }) => [asc(t.lastName)],
    limit: 20,
  }) as Promise<Student[]>
}

export async function getSubjectsForDivision(divisionId: string) {
  const schedules = await db.query.divisionSchedules.findMany({
    where: (t, { eq }) => eq(t.divisionId, divisionId),
    with: { subject: { columns: { id: true, name: true } } },
  })

  const seen = new Set<string>()
  const result: Array<{ id: string; name: string }> = []

  for (const s of schedules) {
    const sub = s.subject
    if (sub && !seen.has(sub.id)) {
      seen.add(sub.id)
      result.push({ id: sub.id, name: sub.name })
    }
  }

  const assignments = await db.query.teacherAssignments.findMany({
    where: (t, { eq }) => eq(t.divisionId, divisionId),
    with: { subject: { columns: { id: true, name: true } } },
  })

  for (const a of assignments) {
    const sub = a.subject
    if (sub && !seen.has(sub.id)) {
      seen.add(sub.id)
      result.push({ id: sub.id, name: sub.name })
    }
  }

  result.sort((a, b) => a.name.localeCompare(b.name))
  return result
}

export async function getAllStudentsForImport(schoolId: string) {
  const allDivisions = await db.query.divisions.findMany({
    where: (t, { eq }) => eq(t.schoolId, schoolId),
    with: { course: { columns: { name: true } } },
    columns: { id: true, name: true },
  })

  const divisionMap = new Map<string, string>()
  for (const d of allDivisions) {
    const courseName = d.course?.name ?? ""
    const key = `${courseName.toLowerCase().trim()}|${d.name.toLowerCase().trim()}`
    divisionMap.set(key, d.id)
  }

  return { divisionMap }
}
