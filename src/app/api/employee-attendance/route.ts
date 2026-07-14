import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { employeeAttendance } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const { date, school_id, records } = await request.json()

    if (!date || !school_id || !records?.length) {
      return NextResponse.json(
        { error: "Fecha, escuela y registros son requeridos" },
        { status: 400 }
      )
    }

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    await db
      .delete(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.schoolId, school_id),
          eq(employeeAttendance.date, date)
        )
      )

    await db.insert(employeeAttendance).values(
      records.map((r: Record<string, unknown>) => ({
        schoolId: r.school_id as string,
        employeeId: r.employee_id as string,
        date: r.date as string,
        status: r.status as string,
        observation: (r.observation as string) ?? null,
        createdBy: session.user.id,
      }))
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}
