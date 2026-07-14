import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { profiles, teacherSchools, preceptorSchools } from "@/lib/db/schema"
import { eq, and, or } from "drizzle-orm"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const { email, school_id, mode } = await request.json()

    if (!email || !school_id || !mode) {
      return NextResponse.json(
        { error: "email, school_id y mode son requeridos" },
        { status: 400 }
      )
    }

    if (mode !== "search" && mode !== "add") {
      return NextResponse.json({ error: "mode debe ser 'search' o 'add'" }, { status: 400 })
    }

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const [callerProfile] = await db
      .select({ role: profiles.role, schoolId: profiles.schoolId })
      .from(profiles)
      .where(eq(profiles.id, session.user.id))
      .limit(1)

    if (!callerProfile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 })
    }

    const isSuperAdmin = callerProfile.role === "super_admin"
    const isSchoolAdmin = callerProfile.role === "school_admin" || callerProfile.role === "director"
    const hasSchoolAccess = isSuperAdmin || (isSchoolAdmin && callerProfile.schoolId === school_id)

    if (!hasSchoolAccess) {
      return NextResponse.json(
        { error: "No tienes permisos para gestionar esta escuela" },
        { status: 403 }
      )
    }

    const [existingProfile] = await db
      .select({
        id: profiles.id,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        email: profiles.email,
        role: profiles.role,
        deactivatedAt: profiles.deactivatedAt,
      })
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1)

    if (!existingProfile) {
      return NextResponse.json(
        { error: "No se encontró un usuario con ese email" },
        { status: 404 }
      )
    }

    if (existingProfile.deactivatedAt) {
      return NextResponse.json(
        { error: "El usuario está desactivado globalmente" },
        { status: 400 }
      )
    }

    const [existingTs] = await db
      .select({ id: teacherSchools.id })
      .from(teacherSchools)
      .where(
        and(
          eq(teacherSchools.teacherId, existingProfile.id),
          eq(teacherSchools.schoolId, school_id)
        )
      )
      .limit(1)

    if (mode === "add") {
      if (existingTs) {
        return NextResponse.json(
          { error: "El usuario ya está asignado a esta escuela como docente" },
          { status: 409 }
        )
      }

      await db.insert(teacherSchools).values({
        teacherId: existingProfile.id,
        schoolId: school_id,
      })
    }

    return NextResponse.json({
      success: true,
      teacher: {
        id: existingProfile.id,
        first_name: existingProfile.firstName,
        last_name: existingProfile.lastName,
        email: existingProfile.email,
      },
      already_assigned: !!existingTs,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}
