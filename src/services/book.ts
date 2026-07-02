import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { PreceptorBookEntry, BookEntryType } from "@/types/database"

export class PreceptorBookService {
  static async getAll(
    supabase: SupabaseClient,
    schoolId: string,
    filters?: {
      type?: BookEntryType
      studentId?: string
      startDate?: string
      endDate?: string
    }
  ): Promise<PreceptorBookEntry[]> {
    let query = supabase
      .from("preceptor_book")
      .select("*, students(first_name, last_name, dni)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })

    if (filters?.type) {
      query = query.eq("type", filters.type)
    }

    if (filters?.studentId) {
      query = query.eq("student_id", filters.studentId)
    }

    if (filters?.startDate) {
      query = query.gte("created_at", filters.startDate)
    }

    if (filters?.endDate) {
      query = query.lte("created_at", filters.endDate)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error fetching book entries: ${error.message}`)
    return data ?? []
  }

  static async create(
    supabase: SupabaseClient,
    schoolId: string,
    data: {
      type: BookEntryType
      title: string
      description: string
      student_id?: string
    },
    userId: string
  ): Promise<PreceptorBookEntry> {
    const { data: entry, error } = await supabase
      .from("preceptor_book")
      .insert({
        school_id: schoolId,
        type: data.type,
        title: data.title,
        description: data.description,
        student_id: data.student_id ?? null,
        created_by: userId,
      })
      .select()
      .single()

    if (error) throw new Error(`Error creating book entry: ${error.message}`)
    return entry
  }

  static async getById(supabase: SupabaseClient, id: string): Promise<PreceptorBookEntry | null> {
    const { data, error } = await supabase
      .from("preceptor_book")
      .select("*, students(first_name, last_name, dni)")
      .eq("id", id)
      .single()

    if (error) throw new Error(`Error fetching book entry: ${error.message}`)
    return data
  }

  static async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from("preceptor_book").delete().eq("id", id)

    if (error) throw new Error(`Error deleting book entry: ${error.message}`)
  }

  static async getStudentEntries(
    supabase: SupabaseClient,
    studentId: string
  ): Promise<PreceptorBookEntry[]> {
    const { data, error } = await supabase
      .from("preceptor_book")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })

    if (error) throw new Error(`Error fetching student book entries: ${error.message}`)
    return data ?? []
  }
}

let cachedUserId: string | null = null

async function ensureContext(client = createClient()) {
  if (!cachedUserId) {
    const { data: { user } } = await client.auth.getUser()
    if (!user) throw new Error("Not authenticated")
    cachedUserId = user.id
  }
  const { getActiveSchoolId } = await import("@/lib/active-school")
  const activeSchoolId = getActiveSchoolId()
  if (activeSchoolId) {
    return { supabase: client, userId: cachedUserId, schoolId: activeSchoolId }
  }
  const { data: profile } = await client
    .from("profiles")
    .select("school_id")
    .eq("id", cachedUserId)
    .maybeSingle()
  return { supabase: client, userId: cachedUserId, schoolId: profile?.school_id ?? "" }
}

export const preceptorBookService = {
  async getEntries(
    filters?: {
      type?: BookEntryType
      studentId?: string
      startDate?: string
      endDate?: string
    }
  ) {
    const { supabase, schoolId } = await ensureContext()
    return PreceptorBookService.getAll(supabase, schoolId ?? "", filters)
  },
  async createEntry(
    data: Omit<PreceptorBookEntry, "id" | "created_at" | "created_by">
  ) {
    const { supabase, schoolId, userId } = await ensureContext()
    return PreceptorBookService.create(supabase, schoolId ?? "", {
      type: data.type,
      title: data.title,
      description: data.description,
      student_id: data.student_id ?? undefined,
    }, userId ?? "")
  },
  async getStudentEntries(studentId: string) {
    const { supabase } = await ensureContext()
    return PreceptorBookService.getStudentEntries(supabase, studentId)
  },
}
