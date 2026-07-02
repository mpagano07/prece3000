import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { school_id, name, start_date, end_date } = await request.json()

    if (!school_id || !name || !start_date || !end_date) {
      return NextResponse.json(
        { error: "school_id, name, start_date y end_date son requeridos" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: existingActive, error: checkError } = await adminClient
      .from("academic_years")
      .select("id")
      .eq("school_id", school_id)
      .eq("active", true)
      .maybeSingle()

    if (checkError) {
      return NextResponse.json(
        { error: `Error al verificar año activo: ${checkError.message}` },
        { status: 500 }
      )
    }

    const { data, error } = await adminClient
      .from("academic_years")
      .insert({
        school_id,
        name,
        start_date,
        end_date,
        active: !existingActive,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Error al crear año académico: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, academic_year: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, active, name, start_date, end_date } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: "Se requiere id" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const adminClient = createAdminClient()

    if (active === true) {
      const { data: ay } = await adminClient
        .from("academic_years")
        .select("school_id")
        .eq("id", id)
        .single()

      if (ay) {
        const { error: deactivateError } = await adminClient
          .from("academic_years")
          .update({ active: false })
          .eq("school_id", ay.school_id)
          .eq("active", true)

        if (deactivateError) {
          return NextResponse.json(
            { error: `Error al desactivar años anteriores: ${deactivateError.message}` },
            { status: 500 }
          )
        }
      }
    }

    const updateData: Record<string, unknown> = {}
    if (active !== undefined) updateData.active = active
    if (name !== undefined) updateData.name = name
    if (start_date !== undefined) updateData.start_date = start_date
    if (end_date !== undefined) updateData.end_date = end_date

    const { data, error } = await adminClient
      .from("academic_years")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Error al actualizar año académico: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, academic_year: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: "Se requiere id" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from("academic_years")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json(
        { error: `Error al eliminar año académico: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}
