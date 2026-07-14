"use server"

import { db } from "@/lib/db"
import { schools, academicYears, students, courses, divisions, profiles } from "@/lib/db/schema"
import { eq, and, count, sql } from "drizzle-orm"
import type { AcademicYear, School } from "@/types/database"

export async function getAllSchools(): Promise<School[]> {
  return db.query.schools.findMany({
    orderBy: (schools, { asc }) => [asc(schools.name)],
  }) as Promise<School[]>
}

export async function getSchoolById(id: string): Promise<School | null> {
  return db.query.schools.findFirst({
    where: eq(schools.id, id),
  }) as Promise<School | null>
}

export async function createSchool(
  data: Pick<School, "name"> & Partial<Omit<School, "id" | "createdAt" | "updatedAt">>
): Promise<School> {
  const rows = await db
    .insert(schools)
    .values({ ...data, active: data.active ?? true })
    .returning()
  return rows[0] as School
}

export async function updateSchool(
  id: string,
  data: Partial<Omit<School, "id" | "createdAt" | "updatedAt">>
): Promise<School> {
  const rows = await db
    .update(schools)
    .set(data)
    .where(eq(schools.id, id))
    .returning()
  return rows[0] as School
}

export async function deleteSchool(id: string): Promise<void> {
  await db.update(schools).set({ active: false }).where(eq(schools.id, id))
}

export async function getActiveAcademicYear(schoolId: string): Promise<AcademicYear | null> {
  return db.query.academicYears.findFirst({
    where: (t, { and }) => and(eq(t.schoolId, schoolId), eq(t.active, true)),
  }) as Promise<AcademicYear | null>
}

export async function getSchoolStats(schoolId: string) {
  const [studentsCount] = await db
    .select({ count: count() })
    .from(students)
    .where(eq(students.schoolId, schoolId))

  const [coursesCount] = await db
    .select({ count: count() })
    .from(courses)
    .where(eq(courses.schoolId, schoolId))

  const [divisionsCount] = await db
    .select({ count: count() })
    .from(divisions)
    .where(eq(divisions.schoolId, schoolId))

  const [teachersCount] = await db
    .select({ count: count() })
    .from(profiles)
    .where(eq(profiles.role, "teacher"))

  const activeYear = await db.query.academicYears.findFirst({
    where: (t, { and }) => and(eq(t.schoolId, schoolId), eq(t.active, true)),
    columns: { name: true },
  })

  return {
    studentsCount: studentsCount.count,
    coursesCount: coursesCount.count,
    divisionsCount: divisionsCount.count,
    teachersCount: teachersCount.count,
    activeAcademicYear: activeYear?.name ?? null,
  }
}

export async function updateSchoolInfo(schoolId: string, data: { name?: string; address?: string; phone?: string; email?: string }) {
  const rows = await db.update(schools).set(data).where(eq(schools.id, schoolId)).returning()
  return rows[0]
}

export async function reactivateSchool(schoolId: string) {
  await db.update(schools).set({ active: true }).where(eq(schools.id, schoolId))
}

export async function getActiveSchools() {
  return db.query.schools.findMany({
    where: and(eq(schools.active, true)),
    orderBy: (t, { asc }) => [asc(t.name)],
  })
}

export async function getAcademicYearsBySchool(schoolId: string) {
  return db.query.academicYears.findMany({
    where: eq(academicYears.schoolId, schoolId),
    orderBy: (t, { desc }) => [desc(t.startDate)],
  })
}
