import type { SupabaseClient } from "@supabase/supabase-js"
import type { Profile } from "@/types/database"

export type TeacherWithSchoolStatus = Profile & {
  school_deactivated_at: string | null
}

export class TeacherService {
  static async getBySchool(
    supabase: SupabaseClient,
    schoolId: string
  ): Promise<TeacherWithSchoolStatus[]> {
    const { data: tsData } = await supabase
      .from("teacher_schools")
      .select("teacher_id, deactivated_at")
      .eq("school_id", schoolId)

    const teacherIds = new Set<string>()
    const deactivatedMap = new Map<string, string | null>()

    if (tsData) {
      for (const t of tsData) {
        teacherIds.add(t.teacher_id)
        if (t.deactivated_at) {
          deactivatedMap.set(t.teacher_id, t.deactivated_at)
        }
      }
    }

    // Fetch profiles from teacher_schools (no role filter needed, being in teacher_schools implies teacher)
    // Also fetch fallback profiles with school_id + role = 'teacher' (for pre-migration teachers)
    const allIds = new Set<string>()

    if (teacherIds.size > 0) {
      const { data: tsProfiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", [...teacherIds])
        .is("deactivated_at", null)

      if (tsProfiles) {
        for (const p of tsProfiles) {
          allIds.add(p.id)
        }
      }
    }

    const { data: fallbackProfiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("school_id", schoolId)
      .eq("role", "teacher")
      .is("deactivated_at", null)

    if (fallbackProfiles) {
      for (const p of fallbackProfiles) {
        allIds.add(p.id)
      }
    }

    if (allIds.size === 0) return []

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .in("id", [...allIds])
      .is("deactivated_at", null)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })

    if (error) throw new Error(`Error fetching teachers: ${error.message}`)

    return (profiles ?? []).map((p) => ({
      ...p,
      school_deactivated_at: deactivatedMap.get(p.id) ?? null,
    }))
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
    const { data: psData } = await supabase
      .from("preceptor_schools")
      .select("preceptor_id")
      .eq("school_id", schoolId)
    const preceptorIds = psData?.map((p) => p.preceptor_id) ?? []

    let query = supabase
      .from("profiles")
      .select("*")
      .eq("role", "preceptor")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })

    if (preceptorIds.length > 0) {
      query = query.or(`school_id.eq.${schoolId},id.in.(${preceptorIds.join(",")})`)
    } else {
      query = query.eq("school_id", schoolId)
    }

    const { data, error } = await query
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

    const schoolId = data.school_id
    if (schoolId && teacher) {
      await supabase.from("teacher_schools").insert({
        teacher_id: teacher.id,
        school_id: schoolId,
      })
    }

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

  static async delete(supabase: SupabaseClient, id: string, schoolId?: string): Promise<void> {
    if (!schoolId) throw new Error("schoolId es requerido para desactivar docente")

    const { error } = await supabase
      .from("teacher_schools")
      .update({ deactivated_at: new Date().toISOString() })
      .eq("teacher_id", id)
      .eq("school_id", schoolId)

    if (error) throw new Error(`Error deactivating teacher: ${error.message}`)
  }

  static async reactivate(supabase: SupabaseClient, id: string, schoolId?: string): Promise<void> {
    if (!schoolId) throw new Error("schoolId es requerido para reactivar docente")

    const { error } = await supabase
      .from("teacher_schools")
      .update({ deactivated_at: null })
      .eq("teacher_id", id)
      .eq("school_id", schoolId)

    if (error) throw new Error(`Error reactivating teacher: ${error.message}`)
  }
}
