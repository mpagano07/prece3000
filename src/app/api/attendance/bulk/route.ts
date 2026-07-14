import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { attendance, attendanceLog } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { sql } from "drizzle-orm"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const { schoolId, divisionId, date, records } = await request.json()

    if (!schoolId || !divisionId || !date || !records?.length) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const userId = session.user.id

    const existingRecords = await db
      .select({ id: attendance.id, studentId: attendance.studentId, status: attendance.status })
      .from(attendance)
      .where(and(eq(attendance.divisionId, divisionId), eq(attendance.date, date)))

    const existingMap = new Map(
      existingRecords.map((r) => [r.studentId, r])
    )

    const result: Array<{ id: string; studentId: string; status: string }> = []

    for (const record of records) {
      const existing = existingMap.get(record.studentId)

      if (existing) {
        const [updated] = await db
          .update(attendance)
          .set({
            status: record.status,
            observation: record.observation ?? null,
            updatedAt: new Date(),
          })
          .where(eq(attendance.id, existing.id))
          .returning()

        result.push({ id: updated.id, studentId: record.studentId, status: record.status })
      } else {
        const [created] = await db
          .insert(attendance)
          .values({
            schoolId,
            studentId: record.studentId,
            divisionId,
            date,
            status: record.status,
            observation: record.observation ?? null,
            createdBy: userId,
          })
          .returning()

        result.push({ id: created.id, studentId: record.studentId, status: record.status })
      }
    }

    const logEntries = result
      .filter((record) => {
        const existing = existingMap.get(record.studentId)
        return !existing || existing.status !== record.status
      })
      .map((record) => {
        const existing = existingMap.get(record.studentId)
        return {
          attendanceId: record.id,
          previousStatus: existing?.status ?? null,
          newStatus: record.status as "present" | "absent" | "absent_justified" | "late" | "early_withdrawal",
          changedBy: userId,
        }
      })

    if (logEntries.length > 0) {
      await db.insert(attendanceLog).values(logEntries)
    }

    return NextResponse.json({ data: result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}
