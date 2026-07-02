import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Communication, CommunicationType } from "@/types/database"

export class CommunicationService {
  static async create(
    supabase: SupabaseClient,
    schoolId: string,
    data: {
      student_id: string
      type: CommunicationType
      message: string
      sent_to: string
    }
  ): Promise<Communication> {
    const { data: communication, error } = await supabase
      .from("communications")
      .insert({
        school_id: schoolId,
        student_id: data.student_id,
        type: data.type,
        message: data.message,
        sent_to: data.sent_to,
        sent_at: new Date().toISOString(),
        status: "sent",
      })
      .select()
      .single()

    if (error) throw new Error(`Error creating communication: ${error.message}`)
    return communication
  }

  static async getByStudent(
    supabase: SupabaseClient,
    studentId: string
  ): Promise<Communication[]> {
    const { data, error } = await supabase
      .from("communications")
      .select("*")
      .eq("student_id", studentId)
      .order("sent_at", { ascending: false })

    if (error) throw new Error(`Error fetching communications: ${error.message}`)
    return data ?? []
  }

  static generateWhatsAppLink(phone: string, message: string): string {
    const cleaned = phone.replace(/[^\d]/g, "")
    const encoded = encodeURIComponent(message)
    return `https://wa.me/${cleaned}?text=${encoded}`
  }

  static generateMailTo(email: string, subject: string, body: string): string {
    const params = new URLSearchParams({ subject, body })
    return `mailto:${email}?${params.toString()}`
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

export const communicationService = {
  async create(data: Omit<Communication, "id" | "sent_at">) {
    const { supabase, schoolId } = await ensureContext()
    return CommunicationService.create(supabase, schoolId ?? "", data)
  },
  async getStudentCommunications(studentId: string) {
    const { supabase } = await ensureContext()
    return CommunicationService.getByStudent(supabase, studentId)
  },
}
