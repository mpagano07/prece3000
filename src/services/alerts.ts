"use server"

import { db } from "@/lib/db"
import { alerts, academicYears, students, attendance } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"
import type { Alert, AlertType } from "@/types/database"

export async function getAlertsBySchool(
  schoolId: string,
  unreadOnly?: boolean
): Promise<Alert[]> {
  const conditions = [eq(alerts.schoolId, schoolId)]
  if (unreadOnly) conditions.push(eq(alerts.read, false))

  return db.query.alerts.findMany({
    where: and(...conditions),
    orderBy: (t, { desc: d }) => [d(t.createdAt)],
    limit: 100,
  }) as Promise<Alert[]>
}

export async function markAlertAsRead(id: string): Promise<void> {
  await db.update(alerts).set({ read: true }).where(eq(alerts.id, id))
}

export async function markAllAlertsAsRead(schoolId: string): Promise<void> {
  await db
    .update(alerts)
    .set({ read: true })
    .where(and(eq(alerts.schoolId, schoolId), eq(alerts.read, false)))
}

export async function createAlert(
  schoolId: string,
  data: {
    studentId?: string
    type: AlertType
    message: string
  }
): Promise<Alert> {
  const rows = await db
    .insert(alerts)
    .values({
      schoolId,
      studentId: data.studentId ?? null,
      type: data.type,
      message: data.message,
      read: false,
    })
    .returning()

  return rows[0] as Alert
}

export async function checkAndGenerateAlerts(schoolId: string): Promise<Alert[]> {
  const generatedAlerts: Alert[] = []

  const academicYear = await db.query.academicYears.findFirst({
    where: and(
      eq(academicYears.schoolId, schoolId),
      eq(academicYears.active, true)
    ),
    columns: { id: true },
  })

  if (!academicYear) return generatedAlerts

  const excessiveAbsenceThreshold = 15

  const activeStudents = await db.query.students.findMany({
    where: and(eq(students.schoolId, schoolId), eq(students.status, "active")),
    with: { attendance: true },
  })

  for (const student of activeStudents) {
    const records = (student as typeof student & { attendance: Array<{ status: string }> }).attendance ?? []
    const absences = records.filter(
      (a) => a.status === "absent" || a.status === "absent_justified"
    ).length

    if (absences >= excessiveAbsenceThreshold) {
      const existingAlert = await db.query.alerts.findFirst({
        where: and(
          eq(alerts.schoolId, schoolId),
          eq(alerts.studentId, student.id),
          eq(alerts.type, "excessive_absences"),
          eq(alerts.read, false)
        ),
      })

      if (!existingAlert) {
        const alert = await createAlert(schoolId, {
          studentId: student.id,
          type: "excessive_absences",
          message: `${student.firstName} ${student.lastName} tiene ${absences} inasistencias (umbral: ${excessiveAbsenceThreshold})`,
        })
        generatedAlerts.push(alert)
      }
    }
  }

  return generatedAlerts
}
