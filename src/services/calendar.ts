import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { CalendarEvent } from "@/types/database"
import { getActiveSchoolId } from "@/lib/active-school"

export class CalendarService {
  static async getAll(
    supabase: SupabaseClient,
    schoolId: string,
    startDate: string,
    endDate: string
  ): Promise<CalendarEvent[]> {
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("school_id", schoolId)
      .gte("start_date", startDate)
      .lte("start_date", endDate)
      .order("start_date", { ascending: true })

    if (error) throw new Error(`Error fetching calendar events: ${error.message}`)
    return data ?? []
  }

  static async create(
    supabase: SupabaseClient,
    schoolId: string,
    data: {
      title: string
      description?: string
      start_date: string
      end_date?: string
      type: string
      all_day?: boolean
    },
    userId: string
  ): Promise<CalendarEvent> {
    const { data: event, error } = await supabase
      .from("calendar_events")
      .insert({
        school_id: schoolId,
        title: data.title,
        description: data.description ?? null,
        start_date: data.start_date,
        end_date: data.end_date ?? null,
        type: data.type,
        all_day: data.all_day ?? false,
        created_by: userId,
      })
      .select()
      .single()

    if (error) throw new Error(`Error creating calendar event: ${error.message}`)
    return event
  }

  static async update(
    supabase: SupabaseClient,
    id: string,
    data: Partial<{
      title: string
      description: string
      start_date: string
      end_date: string
      type: string
      all_day: boolean
    }>
  ): Promise<CalendarEvent> {
    const { data: event, error } = await supabase
      .from("calendar_events")
      .update(data)
      .eq("id", id)
      .select()
      .single()

    if (error) throw new Error(`Error updating calendar event: ${error.message}`)
    return event
  }

  static async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from("calendar_events").delete().eq("id", id)

    if (error) throw new Error(`Error deleting calendar event: ${error.message}`)
  }
}

async function ensureContext(client = createClient()) {
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const activeSchoolId = getActiveSchoolId()
  if (activeSchoolId) {
    return { supabase: client, userId: user.id, schoolId: activeSchoolId }
  }
  const { data: profile } = await client
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile?.school_id) throw new Error("No active school selected")
  return { supabase: client, userId: user.id, schoolId: profile.school_id }
}

export const calendarService = {
  async getEvents(startDate: string, endDate: string) {
    const { supabase, schoolId } = await ensureContext()
    return CalendarService.getAll(supabase, schoolId ?? "", startDate, endDate)
  },
  async createEvent(data: Omit<CalendarEvent, "id" | "created_at" | "created_by">) {
    const { supabase, schoolId, userId } = await ensureContext()
    return CalendarService.create(supabase, schoolId ?? "", {
      title: data.title,
      description: data.description ?? undefined,
      start_date: data.start_date,
      end_date: data.end_date ?? undefined,
      type: data.type,
      all_day: data.all_day,
    }, userId ?? "")
  },
}
