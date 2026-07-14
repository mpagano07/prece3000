import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { divisionSchedules, subjects, profiles } from "@/lib/db/schema"
import { eq, and, asc } from "drizzle-orm"
import { headers } from "next/headers"

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

    const conditions = []
    if (division_id) conditions.push(eq(divisionSchedules.divisionId, division_id))
    if (teacher_id) conditions.push(eq(divisionSchedules.teacherId, teacher_id))
    if (school_id) conditions.push(eq(divisionSchedules.schoolId, school_id))

    const data = await db.query.divisionSchedules.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        subject: { columns: { name: true } },
        teacher: { columns: { firstName: true, lastName: true } },
      },
      orderBy: (t, { asc: a }) => [a(t.dayOfWeek), a(t.timeStart)],
    })

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

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    await db
      .delete(divisionSchedules)
      .where(eq(divisionSchedules.divisionId, division_id))

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
      await db.insert(divisionSchedules).values(
        rows.map((r) => ({
          divisionId: r.division_id,
          subjectId: r.subject_id,
          teacherId: r.teacher_id,
          schoolId: r.school_id,
          dayOfWeek: r.day_of_week,
          timeStart: r.time_start,
          timeEnd: r.time_end,
        }))
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
