import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profiles, schools, preceptorSchools, teacherSchools } from "@/lib/db/schema"
import { eq, inArray, or, and } from "drizzle-orm"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    const session = await auth.api.getSession({
      headers: await headers(),
    })
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const profileRows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1)

    const profile = profileRows[0] ?? null
    if (!profile) {
      return NextResponse.json({ profile: null, schools: [] })
    }

    let schoolsData: typeof schools.$inferSelect[] = []

    if (profile.role === "super_admin") {
      schoolsData = await db
        .select()
        .from(schools)
        .where(eq(schools.active, true))
    } else if (profile.role === "preceptor") {
      const schoolIds: string[] = []
      if (profile.schoolId) schoolIds.push(profile.schoolId)

      const extraSchoolRows = await db
        .select({ schoolId: preceptorSchools.schoolId })
        .from(preceptorSchools)
        .where(eq(preceptorSchools.preceptorId, userId))

      for (const es of extraSchoolRows) {
        if (!schoolIds.includes(es.schoolId)) {
          schoolIds.push(es.schoolId)
        }
      }

      if (schoolIds.length > 0) {
        schoolsData = await db
          .select()
          .from(schools)
          .where(inArray(schools.id, schoolIds))
      }
    } else if (profile.role === "teacher") {
      const schoolIds: string[] = []
      if (profile.schoolId) schoolIds.push(profile.schoolId)

      const extraSchoolRows = await db
        .select({ schoolId: teacherSchools.schoolId })
        .from(teacherSchools)
        .where(eq(teacherSchools.teacherId, userId))

      for (const es of extraSchoolRows) {
        if (!schoolIds.includes(es.schoolId)) {
          schoolIds.push(es.schoolId)
        }
      }

      if (schoolIds.length > 0) {
        schoolsData = await db
          .select()
          .from(schools)
          .where(inArray(schools.id, schoolIds))
      }
    } else if (profile.schoolId) {
      schoolsData = await db
        .select()
        .from(schools)
        .where(eq(schools.id, profile.schoolId))
        .limit(1)
    }

    return NextResponse.json({ profile, schools: schoolsData })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}
