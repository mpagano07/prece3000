import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { date, school_id, records } = await request.json()

    if (!date || !school_id || !records?.length) {
      return NextResponse.json(
        { error: "Fecha, escuela y registros son requeridos" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { error: deleteError } = await adminClient
      .from("employee_attendance")
      .delete()
      .eq("school_id", school_id)
      .eq("date", date)

    if (deleteError) {
      return NextResponse.json(
        { error: `Error al actualizar registros: ${deleteError.message}` },
        { status: 500 }
      )
    }

    const { error: insertError } = await adminClient
      .from("employee_attendance")
      .insert(records)

    if (insertError) {
      return NextResponse.json(
        { error: `Error al guardar asistencia: ${insertError.message}` },
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
