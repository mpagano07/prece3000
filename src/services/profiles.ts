"use server"

import { db } from "@/lib/db"
import { profiles, schools, preceptorSchools, teacherSchools } from "@/lib/db/schema"
import { eq, and, inArray, asc } from "drizzle-orm"

export async function getUserProfile(userId: string) {
  const profileRows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)

  const profile = profileRows[0] ?? null
  if (!profile) return { profile: null, schools: [] as typeof schools.$inferSelect[] }

  let schoolsData: typeof schools.$inferSelect[] = []

  if (profile.role === "super_admin") {
    schoolsData = await db.query.schools.findMany({
      where: eq(schools.active, true),
    })
  } else if (profile.role === "preceptor") {
    const schoolIds: string[] = []
    if (profile.schoolId) schoolIds.push(profile.schoolId)

    const extraSchoolRows = await db
      .select({ schoolId: preceptorSchools.schoolId })
      .from(preceptorSchools)
      .where(eq(preceptorSchools.preceptorId, userId))

    for (const es of extraSchoolRows) {
      if (!schoolIds.includes(es.schoolId)) schoolIds.push(es.schoolId)
    }

    if (schoolIds.length > 0) {
      schoolsData = await db.query.schools.findMany({
        where: inArray(schools.id, schoolIds),
      })
    }
  } else if (profile.role === "teacher") {
    const schoolIds: string[] = []
    if (profile.schoolId) schoolIds.push(profile.schoolId)

    const extraSchoolRows = await db
      .select({ schoolId: teacherSchools.schoolId })
      .from(teacherSchools)
      .where(eq(teacherSchools.teacherId, userId))

    for (const es of extraSchoolRows) {
      if (!schoolIds.includes(es.schoolId)) schoolIds.push(es.schoolId)
    }

    if (schoolIds.length > 0) {
      schoolsData = await db.query.schools.findMany({
        where: inArray(schools.id, schoolIds),
      })
    }
  } else if (profile.schoolId) {
    schoolsData = await db.query.schools.findMany({
      where: eq(schools.id, profile.schoolId),
    })
  }

  return { profile, schools: schoolsData }
}

export async function updateProfile(
  userId: string,
  data: Partial<Pick<typeof profiles.$inferSelect, "firstName" | "lastName" | "phone" | "avatarUrl">>
) {
  const rows = await db
    .update(profiles)
    .set(data)
    .where(eq(profiles.id, userId))
    .returning()
  return rows[0]
}

export async function getProfilesBySchoolAndRole(schoolId: string, role: string) {
  return db.query.profiles.findMany({
    where: and(eq(profiles.schoolId, schoolId), eq(profiles.role, role as any)),
    orderBy: (t, { asc }) => [asc(t.lastName), asc(t.firstName)],
  })
}

export async function getProfilesByIds(ids: string[]) {
  if (ids.length === 0) return []
  return db.query.profiles.findMany({
    where: inArray(profiles.id, ids),
    columns: { id: true, firstName: true, lastName: true },
  })
}

export async function getProfilesBySchoolAndRoles(schoolId: string, roles: string[]) {
  return db.query.profiles.findMany({
    where: and(eq(profiles.schoolId, schoolId), inArray(profiles.role, roles as any[])),
    orderBy: (t, { asc }) => [asc(t.role), asc(t.lastName), asc(t.firstName)],
  })
}
