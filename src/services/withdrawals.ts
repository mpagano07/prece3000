import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Withdrawal } from "@/types/database"
import { format } from "date-fns"

export class WithdrawalService {
  static async getByStudent(
    supabase: SupabaseClient,
    studentId: string
  ): Promise<Withdrawal[]> {
    const { data, error } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })

    if (error) throw new Error(`Error fetching withdrawals: ${error.message}`)
    return data ?? []
  }

  static async create(
    supabase: SupabaseClient,
    schoolId: string,
    data: {
      student_id: string
      withdrawn_by: string
      document?: string
      observations?: string
      signature?: string
      date: string
      time: string
    }
  ): Promise<Withdrawal> {
    const { data: withdrawal, error } = await supabase
      .from("withdrawals")
      .insert({
        school_id: schoolId,
        student_id: data.student_id,
        withdrawn_by: data.withdrawn_by,
        document: data.document ?? null,
        observations: data.observations ?? null,
        signature: data.signature ?? null,
        date: data.date,
        time: data.time,
      })
      .select()
      .single()

    if (error) throw new Error(`Error creating withdrawal: ${error.message}`)
    return withdrawal
  }

  static async getToday(
    supabase: SupabaseClient,
    schoolId: string,
    divisionId?: string
  ): Promise<
    (Withdrawal & { students: { first_name: string; last_name: string; dni: string } | null })[]
  > {
    const today = format(new Date(), "yyyy-MM-dd")

    let query = supabase
      .from("withdrawals")
      .select("*, students(first_name, last_name, dni)")
      .eq("school_id", schoolId)
      .eq("date", today)
      .order("time", { ascending: true })

    if (divisionId) {
      query = query.eq("students.division_id", divisionId)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error fetching today's withdrawals: ${error.message}`)
    return (data ?? []) as (Withdrawal & { students: { first_name: string; last_name: string; dni: string } | null })[]
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

export const withdrawalService = {
  async getStudentWithdrawals(studentId: string) {
    const { supabase } = await ensureContext()
    return WithdrawalService.getByStudent(supabase, studentId)
  },
  async create(data: Omit<Withdrawal, "id" | "created_at">) {
    const { supabase, schoolId } = await ensureContext()
    return WithdrawalService.create(supabase, schoolId ?? "", {
      student_id: data.student_id,
      withdrawn_by: data.withdrawn_by,
      document: data.document ?? undefined,
      observations: data.observations ?? undefined,
      signature: data.signature ?? undefined,
      date: data.date,
      time: data.time,
    })
  },
}
