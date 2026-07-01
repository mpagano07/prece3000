import type { SupabaseClient } from "@supabase/supabase-js"
import type { Alert, AlertType } from "@/types/database"
import { format } from "date-fns"

export class AlertService {
  static async getBySchool(
    supabase: SupabaseClient,
    schoolId: string,
    unreadOnly?: boolean
  ): Promise<Alert[]> {
    let query = supabase
      .from("alerts")
      .select("*, students(first_name, last_name)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(100)

    if (unreadOnly) {
      query = query.eq("read", false)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error fetching alerts: ${error.message}`)
    return data ?? []
  }

  static async markAsRead(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase
      .from("alerts")
      .update({ read: true })
      .eq("id", id)

    if (error) throw new Error(`Error marking alert as read: ${error.message}`)
  }

  static async markAllAsRead(supabase: SupabaseClient, schoolId: string): Promise<void> {
    const { error } = await supabase
      .from("alerts")
      .update({ read: true })
      .eq("school_id", schoolId)
      .eq("read", false)

    if (error) throw new Error(`Error marking all alerts as read: ${error.message}`)
  }

  static async create(
    supabase: SupabaseClient,
    schoolId: string,
    data: {
      student_id?: string
      type: AlertType
      message: string
    }
  ): Promise<Alert> {
    const { data: alert, error } = await supabase
      .from("alerts")
      .insert({
        school_id: schoolId,
        student_id: data.student_id ?? null,
        type: data.type,
        message: data.message,
        read: false,
      })
      .select()
      .single()

    if (error) throw new Error(`Error creating alert: ${error.message}`)
    return alert
  }

  static async checkAndGenerate(supabase: SupabaseClient, schoolId: string): Promise<Alert[]> {
    const alerts: Alert[] = []

    const { data: academicYear } = await supabase
      .from("academic_years")
      .select("id")
      .eq("school_id", schoolId)
      .eq("active", true)
      .maybeSingle()

    if (!academicYear) return alerts

    const excessiveAbsenceThreshold = 15

    const { data: students } = await supabase
      .from("students")
      .select("id, first_name, last_name, attendance(status)")
      .eq("school_id", schoolId)
      .eq("status", "active")

    if (students) {
      for (const student of students) {
        const records = (student.attendance as { status: string }[]) ?? []
        const absences = records.filter(
          (a) => a.status === "absent" || a.status === "absent_justified"
        ).length

        if (absences >= excessiveAbsenceThreshold) {
          const existingAlert = await supabase
            .from("alerts")
            .select("id")
            .eq("school_id", schoolId)
            .eq("student_id", student.id)
            .eq("type", "excessive_absences")
            .eq("read", false)
            .maybeSingle()

          if (!existingAlert.data) {
            const alert = await AlertService.create(supabase, schoolId, {
              student_id: student.id,
              type: "excessive_absences",
              message: `${student.first_name} ${student.last_name} tiene ${absences} inasistencias (umbral: ${excessiveAbsenceThreshold})`,
            })
            alerts.push(alert)
          }
        }
      }
    }

    return alerts
  }
}
