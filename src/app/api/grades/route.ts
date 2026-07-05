import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      student_id,
      subject_id,
      division_id,
      school_id,
      academic_year_id,
      partial_1,
      final_1,
      partial_2,
      final_2,
    } = body

    if (!student_id || !subject_id || !division_id || !school_id || !academic_year_id) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const validPartials = ["TEA", "TEP", "TED", null]
    const sanitized = {
      student_id,
      subject_id,
      division_id,
      school_id,
      academic_year_id,
      partial_1: validPartials.includes(partial_1) ? partial_1 : null,
      final_1: final_1 !== undefined && final_1 !== "" && final_1 !== null
        ? parseFloat(final_1) : null,
      partial_2: validPartials.includes(partial_2) ? partial_2 : null,
      final_2: final_2 !== undefined && final_2 !== "" && final_2 !== null
        ? parseFloat(final_2) : null,
      updated_by: user.id,
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from("grades")
      .upsert(sanitized, {
        onConflict: "student_id,subject_id,division_id,academic_year_id",
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Error al guardar calificación: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ grade: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}
