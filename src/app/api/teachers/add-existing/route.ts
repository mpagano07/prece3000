import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

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

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Verify caller has access to the school
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role, school_id")
      .eq("id", user.id)
      .single()

    if (!callerProfile) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 })
    }

    const isSuperAdmin = callerProfile.role === "super_admin"
    const isSchoolAdmin = callerProfile.role === "school_admin" || callerProfile.role === "director"
    const hasSchoolAccess = isSuperAdmin || (isSchoolAdmin && callerProfile.school_id === school_id)

    if (!hasSchoolAccess) {
      return NextResponse.json(
        { error: "No tienes permisos para gestionar esta escuela" },
        { status: 403 }
      )
    }

    const adminClient = createAdminClient()

    // Find the teacher by email
    const { data: existingProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, first_name, last_name, email, role, deactivated_at")
      .eq("email", email)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (!existingProfile) {
      return NextResponse.json(
        { error: "No se encontró un usuario con ese email" },
        { status: 404 }
      )
    }

    if (existingProfile.deactivated_at) {
      return NextResponse.json(
        { error: "El usuario está desactivado globalmente" },
        { status: 400 }
      )
    }

    // Check if already in this school
    const { data: existingTs } = await adminClient
      .from("teacher_schools")
      .select("id")
      .eq("teacher_id", existingProfile.id)
      .eq("school_id", school_id)
      .maybeSingle()

    if (mode === "add") {
      if (existingTs) {
        return NextResponse.json(
          { error: "El usuario ya está asignado a esta escuela como docente" },
          { status: 409 }
        )
      }

      const { error: insertError } = await adminClient
        .from("teacher_schools")
        .insert({ teacher_id: existingProfile.id, school_id })

      if (insertError) {
        return NextResponse.json(
          { error: `Error al asignar docente: ${insertError.message}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      teacher: {
        id: existingProfile.id,
        first_name: existingProfile.first_name,
        last_name: existingProfile.last_name,
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
