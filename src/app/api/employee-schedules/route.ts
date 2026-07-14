import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { employeeSchedules } from "@/lib/db/schema"
import { eq, and, asc } from "drizzle-orm"
import { headers } from "next/headers"

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

    const data = await db.query.employeeSchedules.findMany({
      where: eq(employeeSchedules.schoolId, school_id),
      orderBy: (t, { asc: a }) => [a(t.dayOfWeek), a(t.timeStart)],
    })

    const grouped: Record<string, Record<number, { time_start: string; time_end: string }[]>> = {}
    for (const s of data) {
      if (!grouped[s.employeeId]) grouped[s.employeeId] = {}
      if (!grouped[s.employeeId][s.dayOfWeek]) grouped[s.employeeId][s.dayOfWeek] = []
      grouped[s.employeeId][s.dayOfWeek].push({
        time_start: s.timeStart.slice(0, 5),
        time_end: s.timeEnd.slice(0, 5),
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

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const conditions: ReturnType<typeof eq>[] = [eq(employeeSchedules.schoolId, school_id)]
    if (employee_id) conditions.push(eq(employeeSchedules.employeeId, employee_id))

    await db
      .delete(employeeSchedules)
      .where(and(...conditions))

    const rows: ScheduleRow[] = []
    for (const [empId, days] of Object.entries(schedules) as [string, Record<string, { timeStart?: string; timeEnd?: string; time_start?: string; time_end?: string }[]>][]) {
      if (employee_id && empId !== employee_id) continue
      for (const [dayStr, slots] of Object.entries(days)) {
        const day = Number(dayStr)
        for (const slot of slots) {
          rows.push({
            employee_id: empId,
            school_id,
            day_of_week: day,
            time_start: slot.timeStart ?? slot.time_start ?? "",
            time_end: slot.timeEnd ?? slot.time_end ?? "",
          })
        }
      }
    }

    if (rows.length > 0) {
      await db.insert(employeeSchedules).values(
        rows.map((r) => ({
          employeeId: r.employee_id,
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
