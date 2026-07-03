import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

interface ScheduleRow {
  division_id: string
  subject_id: string
  teacher_id: string
  school_id: string
  day_of_week: number
  time_start: string
  time_end: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const division_id = searchParams.get("division_id")
    const teacher_id = searchParams.get("teacher_id")
    const school_id = searchParams.get("school_id")

    const adminClient = createAdminClient()
    let query = adminClient
      .from("division_schedules")
      .select("*, subject:subjects(name), teacher:profiles!teacher_id(first_name, last_name)")

    if (division_id) {
      query = query.eq("division_id", division_id)
    }
    if (teacher_id) {
      query = query.eq("teacher_id", teacher_id)
    }
    if (school_id) {
      query = query.eq("school_id", school_id)
    }

    const { data, error } = await query.order("day_of_week").order("time_start")

    if (error) {
      return NextResponse.json(
        { error: `Error al obtener horarios: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ schedules: data ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { division_id, school_id, schedules } = await request.json()

    if (!division_id || !school_id || !schedules) {
      return NextResponse.json(
        { error: "division_id, school_id y schedules son requeridos" },
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
      .from("division_schedules")
      .delete()
      .eq("division_id", division_id)

    if (deleteError) {
      return NextResponse.json(
        { error: `Error al actualizar horarios: ${deleteError.message}` },
        { status: 500 }
      )
    }

    const rows: ScheduleRow[] = []
    for (const slot of schedules) {
      rows.push({
        division_id,
        subject_id: slot.subject_id,
        teacher_id: slot.teacher_id,
        school_id,
        day_of_week: slot.day_of_week,
        time_start: slot.time_start,
        time_end: slot.time_end,
      })
    }

    if (rows.length > 0) {
      const { error: insertError } = await adminClient
        .from("division_schedules")
        .insert(rows)

      if (insertError) {
        return NextResponse.json(
          { error: `Error al guardar horarios: ${insertError.message}` },
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
