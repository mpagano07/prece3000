import type { SupabaseClient } from "@supabase/supabase-js"
import type { Profile } from "@/types/database"
import { createClient } from "@/lib/supabase/client"

export class TeacherService {
  static async getBySchool(
    supabase: SupabaseClient,
    schoolId: string
  ): Promise<Profile[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("school_id", schoolId)
      .eq("role", "teacher")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })

    if (error) throw new Error(`Error fetching teachers: ${error.message}`)
    return data ?? []
  }

  static async getByDivision(
    supabase: SupabaseClient,
    divisionId: string
  ): Promise<Profile[]> {
    const { data: assignments, error } = await supabase
      .from("teacher_assignments")
      .select("teacher_id")
      .eq("division_id", divisionId)

    if (error) throw new Error(`Error fetching teacher assignments: ${error.message}`)

    if (!assignments || assignments.length === 0) return []

    const teacherIds = assignments.map((a: { teacher_id: string }) => a.teacher_id)

    const { data: teachers, error: teachersError } = await supabase
      .from("profiles")
      .select("*")
      .in("id", teacherIds)
      .order("last_name", { ascending: true })

    if (teachersError) throw new Error(`Error fetching teachers: ${teachersError.message}`)
    return teachers ?? []
  }

  static async getPreceptorsBySchool(
    supabase: SupabaseClient,
    schoolId: string
  ): Promise<Profile[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("school_id", schoolId)
      .eq("role", "preceptor")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })

    if (error) throw new Error(`Error fetching preceptors: ${error.message}`)
    return data ?? []
  }

  static async create(
    supabase: SupabaseClient,
    data: Pick<Profile, "school_id" | "first_name" | "last_name" | "email"> & {
      phone?: string
    }
  ): Promise<Profile> {
    const { data: teacher, error } = await supabase
      .from("profiles")
      .insert({
        ...data,
        role: "teacher",
      })
      .select()
      .single()

    if (error) throw new Error(`Error creating teacher: ${error.message}`)
    return teacher
  }

  static async update(
    supabase: SupabaseClient,
    id: string,
    data: Partial<Pick<Profile, "first_name" | "last_name" | "email" | "phone">>
  ): Promise<Profile> {
    const { data: teacher, error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", id)
      .eq("role", "teacher")
      .select()
      .single()

    if (error) throw new Error(`Error updating teacher: ${error.message}`)
    return teacher
  }

  static async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ school_id: null })
      .eq("id", id)
      .eq("role", "teacher")

    if (error) throw new Error(`Error deactivating teacher: ${error.message}`)
  }
}
