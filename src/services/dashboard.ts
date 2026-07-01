import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Alert, Student, CalendarEvent } from "@/types/database"
import { format } from "date-fns"

export class DashboardService {
  static async getStats(
    supabase: SupabaseClient,
    schoolId: string,
    divisionId?: string,
    date?: string
  ): Promise<{
    present: number
    absent: number
    late: number
    early_withdrawal: number
    total: number
  }> {
    const today = date ?? format(new Date(), "yyyy-MM-dd")

    let query = supabase
      .from("attendance")
      .select("status")
      .eq("school_id", schoolId)
      .eq("date", today)

    if (divisionId) {
      query = query.eq("division_id", divisionId)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error fetching dashboard stats: ${error.message}`)

    const records = data ?? []
    const present = records.filter((r) => r.status === "present").length
    const absent = records.filter(
      (r) => r.status === "absent" || r.status === "absent_justified"
    ).length
    const late = records.filter((r) => r.status === "late").length
    const early_withdrawal = records.filter((r) => r.status === "early_withdrawal").length

    return {
      present,
      absent,
      late,
      early_withdrawal,
      total: records.length,
    }
  }

  static async getBirthdays(supabase: SupabaseClient, schoolId: string): Promise<Student[]> {
    const today = new Date()
    const month = today.getMonth() + 1
    const day = today.getDate()

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("school_id", schoolId)
      .eq("status", "active")

    if (error) throw new Error(`Error fetching birthdays: ${error.message}`)

    const birthdays = (data ?? []).filter((student) => {
      if (!student.birth_date) return false
      const bd = new Date(student.birth_date)
      return bd.getMonth() + 1 === month && bd.getDate() === day
    })

    return birthdays
  }

  static async getAlerts(supabase: SupabaseClient, schoolId: string): Promise<Alert[]> {
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("school_id", schoolId)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) throw new Error(`Error fetching alerts: ${error.message}`)
    return data ?? []
  }

  static async getUpcomingEvents(
    supabase: SupabaseClient,
    schoolId: string,
    limit: number = 5
  ): Promise<CalendarEvent[]> {
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("school_id", schoolId)
      .gte("start_date", format(new Date(), "yyyy-MM-dd"))
      .order("start_date", { ascending: true })
      .limit(limit)

    if (error) throw new Error(`Error fetching upcoming events: ${error.message}`)
    return data ?? []
  }

  static async getNearFailing(
    supabase: SupabaseClient,
    schoolId: string
  ): Promise<(Student & { absenceCount: number; attendancePercentage: number })[]> {
    const { data, error } = await supabase
      .from("students")
      .select("*, attendance!inner(status)")
      .eq("school_id", schoolId)
      .eq("status", "active")

    if (error) throw new Error(`Error fetching students for failing check: ${error.message}`)

    const result = (data ?? [])
      .map((student) => {
        const attendanceRecords = student.attendance as { status: string }[]
        const total = attendanceRecords.length
        const absent = attendanceRecords.filter(
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

export const dashboardService = {
  async getStats(divisionId?: string) {
    const { supabase, schoolId } = await ensureContext()
    return DashboardService.getStats(supabase, schoolId ?? "", divisionId)
  },
  async getBirthdays() {
    const { supabase, schoolId } = await ensureContext()
    return DashboardService.getBirthdays(supabase, schoolId ?? "")
  },
  async getAlerts() {
    const { supabase, schoolId } = await ensureContext()
    return DashboardService.getAlerts(supabase, schoolId ?? "")
  },
  async getUpcomingEvents() {
    const { supabase, schoolId } = await ensureContext()
    return DashboardService.getUpcomingEvents(supabase, schoolId ?? "")
  },
  async getNearFailingStudents() {
    const { supabase, schoolId } = await ensureContext()
    return DashboardService.getNearFailing(supabase, schoolId ?? "")
  },
}
