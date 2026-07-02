import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { user_id, school_ids, role } = await request.json()

    if (!user_id) {
      return NextResponse.json(
        { error: "Se requiere user_id" },
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

    if (school_ids && school_ids.length > 0) {
      const { error: profileError } = await adminClient
        .from("profiles")
        .update({ school_id: school_ids[0] })
        .eq("id", user_id)

      if (profileError) {
        return NextResponse.json(
          { error: `Error al actualizar perfil: ${profileError.message}` },
          { status: 500 }
        )
      }

      const { error: deleteError } = await adminClient
        .from("preceptor_schools")
        .delete()
        .eq("preceptor_id", user_id)

      if (deleteError) {
        return NextResponse.json(
          { error: `Error al reasignar escuelas: ${deleteError.message}` },
          { status: 500 }
        )
      }

      const { error: insertError } = await adminClient
        .from("preceptor_schools")
        .insert(
          school_ids.map((sid: string) => ({
            preceptor_id: user_id,
            school_id: sid,
          }))
        )

      if (insertError) {
        return NextResponse.json(
          { error: `Error al asignar escuelas: ${insertError.message}` },
          { status: 500 }
        )
      }
    }

    if (role) {
      const { error: roleError } = await adminClient
        .from("profiles")
        .update({ role })
        .eq("id", user_id)

      if (roleError) {
        return NextResponse.json(
          { error: `Error al actualizar rol: ${roleError.message}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}
