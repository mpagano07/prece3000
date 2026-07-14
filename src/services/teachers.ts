"use server"

import { db } from "@/lib/db"
import { profiles, teacherSchools, preceptorSchools, teacherAssignments } from "@/lib/db/schema"
import { eq, and, inArray, asc } from "drizzle-orm"
import { randomUUID } from "crypto"
import type { Profile } from "@/types/database"

export type TeacherWithSchoolStatus = Profile & {
  schoolDeactivatedAt: Date | null
}

export async function getTeachersBySchool(schoolId: string): Promise<TeacherWithSchoolStatus[]> {
  const tsRows = await db.query.teacherSchools.findMany({
    where: eq(teacherSchools.schoolId, schoolId),
  })

  const teacherIds = new Set<string>()
  const deactivatedMap = new Map<string, string | null>()

  for (const t of tsRows) {
    teacherIds.add(t.teacherId)
    if (t.deactivatedAt) {
      deactivatedMap.set(t.teacherId, t.deactivatedAt as unknown as string)
    }
  }

  const allIds = new Set<string>()

  if (teacherIds.size > 0) {
    const tsProfiles = await db.query.profiles.findMany({
      where: and(
        inArray(profiles.id, [...teacherIds]),
        eq(profiles.deactivatedAt, null as unknown as Date)
      ),
    })
    for (const p of tsProfiles) allIds.add(p.id)
  }

  const fallbackProfiles = await db.query.profiles.findMany({
    where: and(
      eq(profiles.schoolId, schoolId),
      eq(profiles.role, "teacher"),
      eq(profiles.deactivatedAt, null as unknown as Date)
    ),
  })
  for (const p of fallbackProfiles) allIds.add(p.id)

  if (allIds.size === 0) return []

  const result = await db.query.profiles.findMany({
    where: inArray(profiles.id, [...allIds]),
    orderBy: (t, { asc: a }) => [a(t.lastName), a(t.firstName)],
  })

  return (result as Profile[]).map((p) => ({
    ...p,
    schoolDeactivatedAt: deactivatedMap.get(p.id) ? new Date(deactivatedMap.get(p.id)!) : null,
  }))
}

export async function getTeachersByDivision(divisionId: string): Promise<Profile[]> {
  const assignments = await db.query.teacherAssignments.findMany({
    where: eq(teacherAssignments.divisionId, divisionId),
    columns: { teacherId: true },
  })

  if (assignments.length === 0) return []

  const teacherIds = assignments.map((a) => a.teacherId)

  return db.query.profiles.findMany({
    where: inArray(profiles.id, teacherIds),
    orderBy: (t, { asc: a }) => [a(t.lastName), a(t.firstName)],
  }) as Promise<Profile[]>
}

export async function getPreceptorsBySchool(schoolId: string): Promise<Profile[]> {
  const psRows = await db.query.preceptorSchools.findMany({
    where: eq(preceptorSchools.schoolId, schoolId),
    columns: { preceptorId: true },
  })
  const preceptorIds = psRows.map((p) => p.preceptorId)

  const conditions = [eq(profiles.role, "preceptor")]
  if (preceptorIds.length > 0) {
    conditions.push(
      inArray(profiles.id, preceptorIds)
    )
  }

  return db.query.profiles.findMany({
    where: and(...conditions),
    orderBy: (t, { asc: a }) => [a(t.lastName), a(t.firstName)],
  }) as Promise<Profile[]>
}

export async function createTeacher(
  data: Pick<Profile, "schoolId" | "firstName" | "lastName" | "email"> & {
    phone?: string
  }
): Promise<Profile> {
  const rows = await db
    .insert(profiles)
    .values({
      id: randomUUID(),
      schoolId: data.schoolId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone ?? null,
      role: "teacher",
    })
    .returning()

  const teacher = rows[0] as Profile

  if (data.schoolId && teacher) {
    await db.insert(teacherSchools).values({
      teacherId: teacher.id,
      schoolId: data.schoolId,
    })
  }

  return teacher
}

export async function updateTeacher(
  id: string,
  data: Partial<Pick<Profile, "firstName" | "lastName" | "email" | "phone">>
): Promise<Profile> {
  const updateData: Record<string, unknown> = {}
  if (data.firstName !== undefined) updateData.firstName = data.firstName
  if (data.lastName !== undefined) updateData.lastName = data.lastName
  if (data.email !== undefined) updateData.email = data.email
  if (data.phone !== undefined) updateData.phone = data.phone

  const rows = await db
    .update(profiles)
    .set(updateData)
    .where(and(eq(profiles.id, id), eq(profiles.role, "teacher")))
    .returning()

  return rows[0] as Profile
}

export async function deactivateTeacher(id: string, schoolId?: string): Promise<void> {
  if (!schoolId) throw new Error("schoolId es requerido para desactivar docente")

  await db
    .update(teacherSchools)
    .set({ deactivatedAt: new Date() })
    .where(
      and(eq(teacherSchools.teacherId, id), eq(teacherSchools.schoolId, schoolId))
    )
}

export async function reactivateTeacher(id: string, schoolId?: string): Promise<void> {
  if (!schoolId) throw new Error("schoolId es requerido para reactivar docente")

  await db
    .update(teacherSchools)
    .set({ deactivatedAt: null })
    .where(
      and(eq(teacherSchools.teacherId, id), eq(teacherSchools.schoolId, schoolId))
    )
}

export async function getEmployeesBySchool(schoolId: string): Promise<Profile[]> {
  const tsRows = await db.query.teacherSchools.findMany({
    where: eq(teacherSchools.schoolId, schoolId),
    columns: { teacherId: true },
  })
  const psRows = await db.query.preceptorSchools.findMany({
    where: eq(preceptorSchools.schoolId, schoolId),
    columns: { preceptorId: true },
  })

  const ids = new Set<string>()
  for (const t of tsRows) ids.add(t.teacherId)
  for (const p of psRows) ids.add(p.preceptorId)

  if (ids.size === 0) return []

  return db.query.profiles.findMany({
    where: and(inArray(profiles.id, [...ids]), eq(profiles.deactivatedAt, null as unknown as Date)),
    orderBy: (t, { asc: a }) => [a(t.lastName), a(t.firstName)],
  }) as Promise<Profile[]>
}

export async function getStaffBySchool(schoolId: string): Promise<Profile[]> {
  return db.query.profiles.findMany({
    where: and(
      eq(profiles.schoolId, schoolId),
      inArray(profiles.role, ["teacher", "preceptor", "secretary"]),
      eq(profiles.deactivatedAt, null as unknown as Date),
    ),
    orderBy: (t, { asc: a }) => [a(t.role), a(t.lastName)],
  }) as Promise<Profile[]>
}
