"use server"

import { db } from "@/lib/db"
import { attendance, attendanceLog, students, employeeSchedules, divisionSchedules, employeeAttendance, profiles } from "@/lib/db/schema"
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm"
import { format } from "date-fns"
import type { Attendance, AttendanceStatus } from "@/types/database"

export async function getByDivisionAndDate(
  divisionId: string,
  date: string,
  schoolId: string
): Promise<Attendance[]> {
  return db.query.attendance.findMany({
    where: and(
      eq(attendance.divisionId, divisionId),
      eq(attendance.date, date),
      eq(attendance.schoolId, schoolId)
    ),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  }) as Promise<Attendance[]>
}

export async function markAttendance(
  schoolId: string,
  studentId: string,
  divisionId: string,
  date: string,
  status: AttendanceStatus,
  userId: string,
  observation?: string
): Promise<Attendance> {
  const existing = await db.query.attendance.findFirst({
    where: and(
      eq(attendance.studentId, studentId),
      eq(attendance.date, date),
      eq(attendance.divisionId, divisionId)
    ),
  })

  if (existing) {
    const previousStatus = existing.status
    const rows = await db
      .update(attendance)
      .set({
        status,
        observation: observation ?? existing.observation,
        updatedAt: new Date(),
      })
      .where(eq(attendance.id, existing.id))
      .returning()

    await db.insert(attendanceLog).values({
      attendanceId: existing.id,
      previousStatus,
      newStatus: status,
      changedBy: userId,
    })

    return rows[0] as Attendance
  }

  const rows = await db
    .insert(attendance)
    .values({
      schoolId,
      studentId,
      divisionId,
      date,
      status,
      observation: observation ?? null,
      createdBy: userId,
    })
    .returning()

  await db.insert(attendanceLog).values({
    attendanceId: rows[0].id,
    previousStatus: null,
    newStatus: status,
    changedBy: userId,
  })

  return rows[0] as Attendance
}

export async function markBulk(
  schoolId: string,
  divisionId: string,
  date: string,
  records: { studentId: string; status: AttendanceStatus; observation?: string }[],
  userId: string
): Promise<Attendance[]> {
  const results: Attendance[] = []
  for (const record of records) {
    const attendance = await markAttendance(
      schoolId,
      record.studentId,
      divisionId,
      date,
      record.status,
      userId,
      record.observation
    )
    results.push(attendance)
  }
  return results
}

export async function updateAttendanceRecord(
  id: string,
  status: AttendanceStatus,
  userId: string,
  observation?: string
): Promise<Attendance> {
  const existing = await db.query.attendance.findFirst({
    where: eq(attendance.id, id),
  })

  if (!existing) throw new Error("Attendance record not found")

  const previousStatus = existing.status

  const rows = await db
    .update(attendance)
    .set({
      status,
      observation: observation ?? existing.observation,
      updatedAt: new Date(),
    })
    .where(eq(attendance.id, id))
    .returning()

  await db.insert(attendanceLog).values({
    attendanceId: id,
    previousStatus,
    newStatus: status,
    changedBy: userId,
  })

  return rows[0] as Attendance
}

export async function getMonthlyReport(
  schoolId: string,
  divisionId: string,
  year: number,
  month: number
) {
  const start = format(new Date(year, month - 1, 1), "yyyy-MM-dd")
  const end = format(new Date(year, month, 0), "yyyy-MM-dd")

  const records = await db.query.attendance.findMany({
    where: and(
      eq(attendance.schoolId, schoolId),
      eq(attendance.divisionId, divisionId),
      gte(attendance.date, start),
      lte(attendance.date, end)
    ),
    orderBy: (t, { asc }) => [asc(t.date)],
    columns: { date: true, status: true },
  })

  const reportMap = new Map<string, {
    present: number
    absent: number
    absent_justified: number
    late: number
    early_withdrawal: number
  }>()

  for (const entry of records) {
    if (!reportMap.has(entry.date)) {
      reportMap.set(entry.date, {
        present: 0,
        absent: 0,
        absent_justified: 0,
        late: 0,
        early_withdrawal: 0,
      })
    }
    const day = reportMap.get(entry.date)!
    if (entry.status === "present") day.present++
    else if (entry.status === "absent") day.absent++
    else if (entry.status === "absent_justified") day.absent_justified++
    else if (entry.status === "late") day.late++
    else if (entry.status === "early_withdrawal") day.early_withdrawal++
  }

  return Array.from(reportMap.entries()).map(([date, counts]) => ({
    date,
    ...counts,
  }))
}

export async function getStudentSummary(studentId: string) {
  const records = await db.query.attendance.findMany({
    where: eq(attendance.studentId, studentId),
    columns: { status: true },
  })

  const total = records.length
  const present = records.filter((r) => r.status === "present").length
  const absent = records.filter((r) => r.status === "absent").length
  const absent_justified = records.filter((r) => r.status === "absent_justified").length
  const late = records.filter((r) => r.status === "late").length
  const early_withdrawal = records.filter((r) => r.status === "early_withdrawal").length

  const attended = present + late + early_withdrawal
  const percentage = total > 0 ? Math.round((attended / total) * 100) : 100

  return { total, present, absent, absent_justified, late, early_withdrawal, percentage }
}

export async function getEmployeeSchedulesBySchool(schoolId: string) {
  const data = await db.query.employeeSchedules.findMany({
    where: eq(employeeSchedules.schoolId, schoolId),
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
  return grouped
}

export async function getAttendanceWithStudents(schoolId: string) {
  const records = await db.query.attendance.findMany({
    where: eq(attendance.schoolId, schoolId),
    with: {
      student: { columns: { firstName: true, lastName: true, dni: true } },
      division: { columns: { name: true } },
      creator: { columns: { firstName: true, lastName: true } },
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 200,
  })
  return records
}

export async function getEmployeeAttendanceHistory(schoolId: string) {
  const records = await db.query.employeeAttendance.findMany({
    where: eq(employeeAttendance.schoolId, schoolId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 200,
  })

  const allIds = [
    ...new Set(
      records.flatMap((r) => [r.employeeId, r.createdBy].filter(Boolean))
    ),
  ]

  if (allIds.length === 0) return []

  const profileRows = await db.query.profiles.findMany({
    where: inArray(profiles.id, allIds),
    columns: { id: true, firstName: true, lastName: true },
  })

  const profileMap = new Map(profileRows.map((p) => [p.id, p]))

  return records.map((r) => ({
    ...r,
    employee: profileMap.get(r.employeeId) ?? null,
    creator: profileMap.get(r.createdBy) ?? null,
  }))
}

export async function getDivisionSchedulesBySchool(schoolId: string) {
  return db.query.divisionSchedules.findMany({
    where: eq(divisionSchedules.schoolId, schoolId),
    with: {
      subject: { columns: { name: true } },
      teacher: { columns: { firstName: true, lastName: true } },
    },
    orderBy: (t, { asc: a }) => [a(t.dayOfWeek), a(t.timeStart)],
  })
}

export async function getEmployeeAttendanceByDate(schoolId: string, date: string) {
  return db.query.employeeAttendance.findMany({
    where: and(
      eq(employeeAttendance.schoolId, schoolId),
      eq(employeeAttendance.date, date)
    ),
  })
}

export async function hasSchedulesForSchool(schoolId: string): Promise<boolean> {
  const [empRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(employeeSchedules)
    .where(eq(employeeSchedules.schoolId, schoolId))
    .limit(1)

  if ((empRow?.count ?? 0) > 0) return true

  const [divRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(divisionSchedules)
    .where(eq(divisionSchedules.schoolId, schoolId))
    .limit(1)

  return (divRow?.count ?? 0) > 0
}

export async function getScheduledIdsForDay(schoolId: string, dayOfWeek: number): Promise<Set<string>> {
  const empRows = await db.query.employeeSchedules.findMany({
    where: and(
      eq(employeeSchedules.schoolId, schoolId),
      eq(employeeSchedules.dayOfWeek, dayOfWeek)
    ),
    columns: { employeeId: true },
  })

  const divRows = await db.query.divisionSchedules.findMany({
    where: and(
      eq(divisionSchedules.schoolId, schoolId),
      eq(divisionSchedules.dayOfWeek, dayOfWeek)
    ),
    columns: { teacherId: true },
  })

  const ids = new Set<string>()
  for (const s of empRows) ids.add(s.employeeId)
  for (const s of divRows) ids.add(s.teacherId)
  return ids
}

export async function getAttendanceByDateRange(
  divisionId: string,
  schoolId: string,
  startDate: string,
  endDate: string
) {
  return db.query.attendance.findMany({
    where: and(
      eq(attendance.divisionId, divisionId),
      eq(attendance.schoolId, schoolId),
      gte(attendance.date, startDate),
      lte(attendance.date, endDate)
    ),
    columns: { date: true, status: true },
    orderBy: (t, { asc }) => [asc(t.date)],
  })
}

export async function getAttendanceReportWithStudents(
  divisionId: string,
  schoolId: string,
  startDate: string,
  endDate: string
) {
  return db.query.attendance.findMany({
    where: and(
      eq(attendance.divisionId, divisionId),
      eq(attendance.schoolId, schoolId),
      gte(attendance.date, startDate),
      lte(attendance.date, endDate)
    ),
    with: {
      student: { columns: { firstName: true, lastName: true, dni: true } },
    },
    orderBy: (t, { asc }) => [asc(t.date)],
  })
}
