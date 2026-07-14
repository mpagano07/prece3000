import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { profiles, teacherSchools } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const { user_id, school_id } = await request.json()

    if (!user_id) {
      return NextResponse.json({ error: "user_id es requerido" }, { status: 400 })
    }

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    await auth.api.unbanUser({
      body: { userId: user_id },
    })

    const updates: Record<string, unknown> = { deactivatedAt: null }
    if (school_id) {
      updates.schoolId = school_id
    }

    await db
      .update(profiles)
      .set(updates)
      .where(eq(profiles.id, user_id))

    if (school_id) {
      const [profile] = await db
        .select({ role: profiles.role })
        .from(profiles)
        .where(eq(profiles.id, user_id))
        .limit(1)

      if (profile?.role === "teacher") {
        const [existing] = await db
          .select({ id: teacherSchools.id })
          .from(teacherSchools)
          .where(
            and(
              eq(teacherSchools.teacherId, user_id),
              eq(teacherSchools.schoolId, school_id)
            )
          )
          .limit(1)

        if (existing) {
          await db
            .update(teacherSchools)
            .set({ deactivatedAt: null })
            .where(eq(teacherSchools.id, existing.id))
        } else {
          await db.insert(teacherSchools).values({
            teacherId: user_id,
            schoolId: school_id,
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Reactivate error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
