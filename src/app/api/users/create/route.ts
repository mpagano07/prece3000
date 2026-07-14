import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { profiles, preceptorSchools, teacherSchools } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const { email, password, first_name, last_name, role, school_ids } =
      await request.json()

    if (!email || !password || !first_name || !last_name || !role || !school_ids?.length) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      )
    }

    const validRoles = ["school_admin", "director", "preceptor", "secretary", "teacher"]
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 })
    }

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const authUser = await auth.api.createUser({
      body: {
        email,
        password,
        name: `${first_name} ${last_name}`,
      },
    })

    const primarySchoolId = school_ids[0]

    await db
      .insert(profiles)
      .values({
        id: authUser.user.id as any,
        firstName: first_name,
        lastName: last_name,
        email,
        role: role as "super_admin" | "school_admin" | "director" | "preceptor" | "secretary" | "teacher",
        schoolId: primarySchoolId,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          firstName: first_name,
          lastName: last_name,
          email,
          role: role as "super_admin" | "school_admin" | "director" | "preceptor" | "secretary" | "teacher",
          schoolId: primarySchoolId,
        },
      })

    if (role === "preceptor") {
      await db.insert(preceptorSchools).values(
        school_ids.map((sid: string) => ({
          preceptorId: authUser.user.id,
          schoolId: sid,
        }))
      )
    }

    if (role === "teacher") {
      await db.insert(teacherSchools).values(
        school_ids.map((sid: string) => ({
          teacherId: authUser.user.id,
          schoolId: sid,
        }))
      )
    }

    return NextResponse.json({ success: true, user: authUser.user })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}
