"use server"

import { db } from "@/lib/db"
import { courses, divisions, subjects } from "@/lib/db/schema"
import { eq, asc, and } from "drizzle-orm"
import type { Course, Division, DivisionWithCourse } from "@/types/database"

export async function getCoursesBySchool(
  schoolId: string,
  academicYearId?: string
): Promise<Course[]> {
  const conditions = [eq(courses.schoolId, schoolId)]
  if (academicYearId) conditions.push(eq(courses.academicYearId, academicYearId))

  return db.query.courses.findMany({
    where: conditions.length === 1 ? conditions[0] : undefined,
    orderBy: (t, { asc: a }) => [a(t.name)],
  }) as Promise<Course[]>
}

export async function getCourseById(id: string): Promise<Course | null> {
  return db.query.courses.findFirst({
    where: eq(courses.id, id),
  }) as Promise<Course | null>
}

export async function createCourse(
  data: Pick<Course, "schoolId" | "name" | "academicYearId">
): Promise<Course> {
  const rows = await db
    .insert(courses)
    .values({
      schoolId: data.schoolId,
      name: data.name,
      academicYearId: data.academicYearId,
    })
    .returning()

  return rows[0] as Course
}

export async function updateCourse(
  id: string,
  data: Partial<Pick<Course, "name" | "academicYearId">>
): Promise<Course> {
  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.academicYearId !== undefined) updateData.academicYearId = data.academicYearId

  const rows = await db
    .update(courses)
    .set(updateData)
    .where(eq(courses.id, id))
    .returning()

  return rows[0] as Course
}

export async function deleteCourse(id: string): Promise<void> {
  await db.delete(courses).where(eq(courses.id, id))
}

export async function getDivisions(courseId: string): Promise<DivisionWithCourse[]> {
  return db.query.divisions.findMany({
    where: eq(divisions.courseId, courseId),
    with: { course: true },
    orderBy: (t, { asc }) => [asc(t.name)],
  }) as Promise<DivisionWithCourse[]>
}

export async function createDivision(
  data: Pick<Division, "schoolId" | "courseId" | "name" | "academicYearId"> & {
    shift?: string | null
    preceptorId?: string | null
  }
): Promise<Division> {
  const rows = await db
    .insert(divisions)
    .values({
      schoolId: data.schoolId,
      courseId: data.courseId,
      name: data.name,
      academicYearId: data.academicYearId,
      shift: data.shift ?? null,
      preceptorId: data.preceptorId ?? null,
    })
    .returning()

  return rows[0] as Division
}

export async function updateDivision(
  id: string,
  data: Partial<Pick<Division, "name" | "shift" | "preceptorId">>
): Promise<Division> {
  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.shift !== undefined) updateData.shift = data.shift
  if (data.preceptorId !== undefined) updateData.preceptorId = data.preceptorId

  const rows = await db
    .update(divisions)
    .set(updateData)
    .where(eq(divisions.id, id))
    .returning()

  return rows[0] as Division
}

export async function deleteDivision(id: string): Promise<void> {
  await db.delete(divisions).where(eq(divisions.id, id))
}

export async function getSubjectsBySchool(
  schoolId: string,
  academicYearId: string
) {
  return db.query.subjects.findMany({
    where: and(eq(subjects.schoolId, schoolId), eq(subjects.academicYearId, academicYearId)),
    orderBy: (t, { asc: a }) => [a(t.name)],
  })
}

export async function createSubject(data: { schoolId: string; academicYearId: string; name: string }) {
  const rows = await db.insert(subjects).values({
    schoolId: data.schoolId,
    academicYearId: data.academicYearId,
    name: data.name,
  }).returning()
  return rows[0]
}

export async function getDivisionsBySchool(schoolId: string) {
  return db.query.divisions.findMany({
    where: eq(divisions.schoolId, schoolId),
    with: { course: { columns: { name: true } } },
    orderBy: (t, { asc: a }) => [a(t.name)],
  })
}
