import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { schoolId, divisionId, date, records } = await request.json()

    if (!schoolId || !divisionId || !date || !records?.length) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: existingRecords } = await adminClient
      .from("attendance")
      .select("id, student_id, status")
      .eq("division_id", divisionId)
      .eq("date", date)

    const existingMap = new Map(
      (existingRecords ?? []).map((r) => [r.student_id, r])
    )

    const recordsJson = records.map(
      (r: {
        student_id: string
        status: string
        observation?: string
      }) => ({
        school_id: schoolId,
        student_id: r.student_id,
        division_id: divisionId,
        date,
        status: r.status,
        observation: r.observation ?? null,
      })
    )

    const { data: upserted, error: upsertError } = await adminClient.rpc(
      "bulk_upsert_attendance",
      {
        p_records: recordsJson,
        p_user_id: user.id,
      }
    )

    if (upsertError) {
      return NextResponse.json(
        { error: `Error al guardar asistencia: ${upsertError.message}` },
        { status: 500 }
      )
    }

    const result = upserted ?? []

    const logEntries = result
      .filter(
        (record: { student_id: string; status: string }) => {
          const existing = existingMap.get(record.student_id)
          return !existing || existing.status !== record.status
        }
      )
      .map((record: { id: string; student_id: string; status: string }) => {
        const existing = existingMap.get(record.student_id)
        return {
          attendance_id: record.id,
          previous_status: existing?.status ?? null,
          new_status: record.status,
          changed_by: user.id,
        }
      })

    if (logEntries.length > 0) {
      const { error: logError } = await adminClient
        .from("attendance_log")
        .insert(logEntries)

      if (logError) {
        console.error("Error logging attendance changes:", logError.message)
      }
    }

    return NextResponse.json({ data: result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}
