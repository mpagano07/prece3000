"use server"

import { db } from "@/lib/db"
import { profiles, preceptorSchools, teacherSchools } from "@/lib/db/schema"
import { eq, ne, and, or, inArray, asc, isNull, isNotNull } from "drizzle-orm"
import type { Profile } from "@/types/database"

export async function getAllProfiles(): Promise<Profile[]> {
  return db.query.profiles.findMany({
    where: ne(profiles.role, "super_admin"),
    orderBy: (t, { asc }) => [asc(t.lastName)],
  }) as Promise<Profile[]>
}

export async function getProfilesBySchool(
  schoolId: string,
  extraIds: string[]
): Promise<Profile[]> {
  const conditions = extraIds.length > 0
    ? and(
        isNull(profiles.deactivatedAt),
        or(
          eq(profiles.schoolId, schoolId),
          inArray(profiles.id, extraIds)
        )
      )
    : and(
        eq(profiles.schoolId, schoolId),
        isNull(profiles.deactivatedAt)
      )

  return db.query.profiles.findMany({
    where: conditions,
    orderBy: (t, { asc }) => [asc(t.role), asc(t.lastName)],
  }) as Promise<Profile[]>
}

export async function getAllActiveProfiles(): Promise<Profile[]> {
  return db.query.profiles.findMany({
    where: and(
      ne(profiles.role, "super_admin"),
      isNull(profiles.deactivatedAt)
    ),
    orderBy: (t, { asc }) => [asc(t.role), asc(t.lastName)],
  }) as Promise<Profile[]>
}

export async function getPreceptorSchoolMembers(schoolId: string) {
  return db.query.preceptorSchools.findMany({
    where: eq(preceptorSchools.schoolId, schoolId),
  })
}

export async function getAllPreceptorSchools() {
  return db.query.preceptorSchools.findMany()
}

export async function getTeacherSchoolMembers(schoolId: string) {
  return db.query.teacherSchools.findMany({
    where: eq(teacherSchools.schoolId, schoolId),
  })
}

export async function getDeactivatedProfiles(): Promise<Profile[]> {
  return db.query.profiles.findMany({
    where: and(
      ne(profiles.role, "super_admin"),
      or(
        isNotNull(profiles.deactivatedAt),
        isNull(profiles.schoolId)
      )
    ),
    orderBy: (t, { asc }) => [asc(t.lastName)],
  }) as Promise<Profile[]>
}
