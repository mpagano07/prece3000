import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

interface ScheduleRow {
  employee_id: string
  school_id: string
  day_of_week: number
  time_start: string
  time_end: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const school_id = searchParams.get("school_id")

    if (!school_id) {
      return NextResponse.json(
        { error: "school_id es requerido" },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from("employee_schedules")
      .select("*")
      .eq("school_id", school_id)
      .order("day_of_week")
      .order("time_start")

    if (error) {
      return NextResponse.json(
        { error: `Error al obtener horarios: ${error.message}` },
        { status: 500 }
      )
    }

    const grouped: Record<string, Record<number, { time_start: string; time_end: string }[]>> = {}
    for (const s of data ?? []) {
      if (!grouped[s.employee_id]) grouped[s.employee_id] = {}
      if (!grouped[s.employee_id][s.day_of_week]) grouped[s.employee_id][s.day_of_week] = []
      grouped[s.employee_id][s.day_of_week].push({
        time_start: s.time_start.slice(0, 5),
        time_end: s.time_end.slice(0, 5),
      })
    }

    return NextResponse.json({ schedules: grouped })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { school_id, schedules, employee_id } = await request.json()

    if (!school_id || !schedules) {
      return NextResponse.json(
        { error: "school_id y schedules son requeridos" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const adminClient = createAdminClient()

    let deleteQuery = adminClient
      .from("employee_schedules")
      .delete()
      .eq("school_id", school_id)

    if (employee_id) {
      deleteQuery = deleteQuery.eq("employee_id", employee_id)
    }

    const { error: deleteError } = await deleteQuery

    if (deleteError) {
      return NextResponse.json(
        { error: `Error al actualizar horarios: ${deleteError.message}` },
        { status: 500 }
      )
    }

    const rows: ScheduleRow[] = []
    for (const [empId, days] of Object.entries(schedules) as [string, Record<string, { time_start: string; time_end: string }[]>][]) {
      if (employee_id && empId !== employee_id) continue
      for (const [dayStr, slots] of Object.entries(days)) {
        const day = Number(dayStr)
        for (const slot of slots) {
          rows.push({
            employee_id: empId,
            school_id,
            day_of_week: day,
            time_start: slot.time_start,
            time_end: slot.time_end,
          })
        }
      }
    }

    if (rows.length > 0) {
      const { error: insertError } = await adminClient
        .from("employee_schedules")
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
