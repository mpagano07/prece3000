import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Attendance, AttendanceStatus } from "@/types/database"
import { format, startOfMonth, endOfMonth } from "date-fns"

export class AttendanceService {
  static async getByDivisionAndDate(
    supabase: SupabaseClient,
    divisionId: string,
    date: string,
    schoolId: string
  ): Promise<Attendance[]> {
    const { data, error } = await supabase
      .from("attendance")
      .select("*, students(first_name, last_name, dni)")
      .eq("division_id", divisionId)
      .eq("date", date)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: true })

    if (error) throw new Error(`Error fetching attendance: ${error.message}`)
    return data ?? []
  }

  static async markAttendance(
    supabase: SupabaseClient,
    schoolId: string,
    studentId: string,
    divisionId: string,
    date: string,
    status: AttendanceStatus,
    userId: string,
    observation?: string
  ): Promise<Attendance> {
    const existing = await supabase
      .from("attendance")
      .select("*")
      .eq("student_id", studentId)
      .eq("date", date)
      .eq("division_id", divisionId)
      .maybeSingle()

    if (existing.error) throw new Error(`Error checking existing attendance: ${existing.error.message}`)

    if (existing.data) {
      const previousStatus = existing.data.status
      const { data: updated, error } = await supabase
        .from("attendance")
        .update({
          status,
          observation: observation ?? existing.data.observation,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.data.id)
        .select()
        .single()

      if (error) throw new Error(`Error updating attendance: ${error.message}`)

      await AttendanceService.logChange(
        supabase,
        existing.data.id,
        previousStatus,
        status,
        userId
      )

      return updated
    }

    const { data: created, error } = await supabase
      .from("attendance")
      .insert({
        school_id: schoolId,
        student_id: studentId,
        division_id: divisionId,
        date,
        status,
        observation: observation ?? null,
        created_by: userId,
      })
      .select()
      .single()

    if (error) throw new Error(`Error marking attendance: ${error.message}`)

    await AttendanceService.logChange(
      supabase,
      created.id,
      null,
      status,
      userId
    )

    return created
  }

  static async markBulk(
    supabase: SupabaseClient,
    schoolId: string,
    divisionId: string,
    date: string,
    records: { studentId: string; status: AttendanceStatus; observation?: string }[],
    userId: string
  ): Promise<Attendance[]> {
    const results: Attendance[] = []

    for (const record of records) {
      const attendance = await AttendanceService.markAttendance(
        supabase,
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

  static async updateAttendance(
    supabase: SupabaseClient,
    id: string,
    status: AttendanceStatus,
    userId: string,
    observation?: string
  ): Promise<Attendance> {
    const { data: existing, error: fetchError } = await supabase
      .from("attendance")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError) throw new Error(`Error fetching attendance: ${fetchError.message}`)

    const previousStatus = existing.status

    const { data: updated, error } = await supabase
      .from("attendance")
      .update({
        status,
        observation: observation ?? existing.observation,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw new Error(`Error updating attendance: ${error.message}`)

    await AttendanceService.logChange(supabase, id, previousStatus, status, userId)

    return updated
  }

  static async logChange(
    supabase: SupabaseClient,
    attendanceId: string,
    previousStatus: AttendanceStatus | null,
    newStatus: AttendanceStatus,
    userId: string
  ): Promise<void> {
    const { error } = await supabase.from("attendance_log").insert({
      attendance_id: attendanceId,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: userId,
      changed_at: new Date().toISOString(),
    })

    if (error) throw new Error(`Error logging attendance change: ${error.message}`)
  }

  static async getMonthlyReport(
    supabase: SupabaseClient,
    schoolId: string,
    divisionId: string,
    year: number,
    month: number
  ): Promise<
    {
      date: string
      present: number
      absent: number
      absent_justified: number
      late: number
      early_withdrawal: number
    }[]
  > {
    const start = format(new Date(year, month - 1, 1), "yyyy-MM-dd")
    const end = format(new Date(year, month, 0), "yyyy-MM-dd")

    const { data, error } = await supabase
      .from("attendance")
      .select("date, status")
      .eq("school_id", schoolId)
      .eq("division_id", divisionId)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true })

    if (error) throw new Error(`Error fetching monthly report: ${error.message}`)

    const reportMap = new Map<
      string,
      { present: number; absent: number; absent_justified: number; late: number; early_withdrawal: number }
    >()

    for (const entry of data ?? []) {
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

  static async getStudentSummary(
    supabase: SupabaseClient,
    studentId: string,
    academicYearId: string
  ): Promise<{
    total: number
    present: number
    absent: number
    absent_justified: number
    late: number
    early_withdrawal: number
    percentage: number
  }> {
    const { data, error } = await supabase
      .from("attendance")
      .select("status")
      .eq("student_id", studentId)
      .eq("academic_year_id", academicYearId)

    if (error) throw new Error(`Error fetching student summary: ${error.message}`)

    const records = data ?? []
    const total = records.length
    const present = records.filter((r) => r.status === "present").length
    const absent = records.filter((r) => r.status === "absent").length
    const absent_justified = records.filter((r) => r.status === "absent_justified").length
    const late = records.filter((r) => r.status === "late").length
    const early_withdrawal = records.filter((r) => r.status === "early_withdrawal").length

    const attended = present + late + early_withdrawal
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 100

    return {
      total,
      present,
      absent,
      absent_justified,
      late,
      early_withdrawal,
      percentage,
    }
  }
}

let cachedSchoolId: string | null = null
let cachedUserId: string | null = null

async function ensureContext(client = createClient()) {
  if (!cachedUserId) {
    const { data: { user } } = await client.auth.getUser()
    if (!user) throw new Error("Not authenticated")
    cachedUserId = user.id
  }
  if (!cachedSchoolId) {
    const { data: profile } = await client
      .from("profiles")
      .select("school_id")
      .eq("id", cachedUserId)
      .maybeSingle()
    cachedSchoolId = profile?.school_id ?? ""
  }
  return { supabase: client, userId: cachedUserId, schoolId: cachedSchoolId }
}

export const attendanceService = {
  async getByDivisionAndDate(divisionId: string, date: string) {
    const { supabase, schoolId } = await ensureContext()
    return AttendanceService.getByDivisionAndDate(supabase, divisionId, date, schoolId ?? "")
  },
  async mark(data: {
    student_id: string
    division_id: string
    date: string
    status: AttendanceStatus
    observation?: string
  }) {
    const { supabase, schoolId, userId } = await ensureContext()
    return AttendanceService.markAttendance(
      supabase,
      schoolId ?? "",
      data.student_id,
      data.division_id,
      data.date,
      data.status,
      userId ?? "",
      data.observation
    )
  },
  async markBulk(data: {
    divisionId: string
    date: string
    records: Array<{ student_id: string; status: AttendanceStatus; observation?: string }>
  }) {
    const { supabase, schoolId, userId } = await ensureContext()
    return AttendanceService.markBulk(
      supabase,
      schoolId ?? "",
      data.divisionId,
      data.date,
      data.records.map((r) => ({
        studentId: r.student_id,
        status: r.status,
        observation: r.observation,
      })),
      userId ?? ""
    )
  },
  async getReport(divisionId: string, year: number, month: number) {
    const { supabase, schoolId } = await ensureContext()
    return AttendanceService.getMonthlyReport(supabase, schoolId ?? "", divisionId, year, month)
  },
}
