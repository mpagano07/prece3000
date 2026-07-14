import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { profiles, preceptorSchools, teacherSchools } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const { user_id, school_ids, role } = await request.json()

    if (!user_id) {
      return NextResponse.json(
        { error: "Se requiere user_id" },
        { status: 400 }
      )
    }

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    if (school_ids && school_ids.length > 0) {
      await db
        .update(profiles)
        .set({ schoolId: school_ids[0] })
        .where(eq(profiles.id, user_id))

      await db
        .delete(preceptorSchools)
        .where(eq(preceptorSchools.preceptorId, user_id))

      await db.insert(preceptorSchools).values(
        school_ids.map((sid: string) => ({
          preceptorId: user_id,
          schoolId: sid,
        }))
      )

      await db
        .delete(teacherSchools)
        .where(eq(teacherSchools.teacherId, user_id))

      await db.insert(teacherSchools).values(
        school_ids.map((sid: string) => ({
          teacherId: user_id,
          schoolId: sid,
        }))
      )
    }

    if (role) {
      await db
        .update(profiles)
        .set({ role: role as "super_admin" | "school_admin" | "director" | "preceptor" | "secretary" | "teacher" })
        .where(eq(profiles.id, user_id))
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}
