import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

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
      return NextResponse.json(
        { error: "Rol inválido" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    const adminClient = createAdminClient()

    const { data: authUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name, last_name, role },
      })

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      )
    }

    const primarySchoolId = school_ids[0]

    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        first_name,
        last_name,
        role,
        school_id: primarySchoolId,
      })
      .eq("id", authUser.user.id)

    if (profileError) {
      return NextResponse.json(
        { error: `Error al actualizar perfil: ${profileError.message}` },
        { status: 500 }
      )
    }

    if (role === "preceptor") {
      const { error: psError } = await adminClient
        .from("preceptor_schools")
        .insert(
          school_ids.map((sid: string) => ({
            preceptor_id: authUser.user.id,
            school_id: sid,
          }))
        )

      if (psError) {
        return NextResponse.json(
          { error: `Error al asignar escuelas: ${psError.message}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true, user: authUser.user })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}
