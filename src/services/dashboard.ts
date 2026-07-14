"use server"

import { db } from "@/lib/db"
import { attendance, students, alerts, calendarEvents } from "@/lib/db/schema"
import { eq, and, gte, desc } from "drizzle-orm"
import { format } from "date-fns"
import type { Alert, Student, CalendarEvent } from "@/types/database"

export async function getDashboardStats(
  schoolId: string,
  divisionId?: string,
  date?: string
) {
  const today = date ?? format(new Date(), "yyyy-MM-dd")
  const conditions = [eq(attendance.schoolId, schoolId), eq(attendance.date, today)]
  if (divisionId) conditions.push(eq(attendance.divisionId, divisionId))

  const records = await db.query.attendance.findMany({
    where: and(...conditions),
    columns: { status: true },
  })

  const present = records.filter((r) => r.status === "present").length
  const absent = records.filter(
    (r) => r.status === "absent" || r.status === "absent_justified"
  ).length
  const late = records.filter((r) => r.status === "late").length
  const early_withdrawal = records.filter((r) => r.status === "early_withdrawal").length

  return { present, absent, late, early_withdrawal, total: records.length }
}

export async function getBirthdays(schoolId: string): Promise<Student[]> {
  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()

  const allStudents = await db.query.students.findMany({
    where: and(eq(students.schoolId, schoolId), eq(students.status, "active")),
  })

  return (allStudents as Student[]).filter((student) => {
    if (!student.birthDate) return false
    const bd = new Date(student.birthDate)
    return bd.getMonth() + 1 === month && bd.getDate() === day
  })
}

export async function getAlerts(schoolId: string): Promise<Alert[]> {
  return db.query.alerts.findMany({
    where: and(eq(alerts.schoolId, schoolId), eq(alerts.read, false)),
    orderBy: (t, { desc: d }) => [d(t.createdAt)],
    limit: 50,
  }) as Promise<Alert[]>
}

export async function getUpcomingEvents(
  schoolId: string,
  limit: number = 5
): Promise<CalendarEvent[]> {
  return db.query.calendarEvents.findMany({
    where: and(
      eq(calendarEvents.schoolId, schoolId),
      gte(calendarEvents.startDate, new Date())
    ),
    orderBy: (t, { asc }) => [asc(t.startDate)],
    limit,
  }) as Promise<CalendarEvent[]>
}

export async function getNearFailing(schoolId: string) {
  const activeStudents = await db.query.students.findMany({
    where: and(eq(students.schoolId, schoolId), eq(students.status, "active")),
    with: {
      attendance: true,
    },
  })

  const result = (activeStudents as Array<Student & { attendance: Array<{ status: string }> }>)
    .map((student) => {
      const total = student.attendance.length
      const absent = student.attendance.filter(
        (a) => a.status === "absent" || a.status === "absent_justified"
      ).length
      const percentage = total > 0 ? Math.round(((total - absent) / total) * 100) : 100

      return {
        ...student,
        absenceCount: absent,
        attendancePercentage: percentage,
      }
    })
    .filter((s) => s.attendancePercentage < 75)
    .sort((a, b) => a.attendancePercentage - b.attendancePercentage)
    .slice(0, 20)

  return result
}
