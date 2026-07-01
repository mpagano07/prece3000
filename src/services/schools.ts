import type { SupabaseClient } from "@supabase/supabase-js"
import type { School } from "@/types/database"

export class SchoolService {
  static async getAll(supabase: SupabaseClient): Promise<School[]> {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .eq("active", true)
      .order("name")

    if (error) throw new Error(`Error fetching schools: ${error.message}`)
    return data ?? []
  }

  static async getById(supabase: SupabaseClient, id: string): Promise<School | null> {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw new Error(`Error fetching school: ${error.message}`)
    return data
  }

  static async create(
    supabase: SupabaseClient,
    data: Pick<School, "name"> & Partial<Omit<School, "id" | "created_at" | "updated_at">>
  ): Promise<School> {
    const { data: school, error } = await supabase
      .from("schools")
      .insert({ ...data, active: data.active ?? true })
      .select()
      .single()

    if (error) throw new Error(`Error creating school: ${error.message}`)
    return school
  }

  static async update(
    supabase: SupabaseClient,
    id: string,
    data: Partial<Omit<School, "id" | "created_at" | "updated_at">>
  ): Promise<School> {
    const { data: school, error } = await supabase
      .from("schools")
      .update(data)
      .eq("id", id)
      .select()
      .single()

    if (error) throw new Error(`Error updating school: ${error.message}`)
    return school
  }

  static async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase
      .from("schools")
      .update({ active: false })
      .eq("id", id)

    if (error) throw new Error(`Error deleting school: ${error.message}`)
  }

  static async getStats(
    supabase: SupabaseClient,
    schoolId: string
  ): Promise<{
    studentsCount: number
    coursesCount: number
    divisionsCount: number
    teachersCount: number
    activeAcademicYear: string | null
  }> {
    const [students, courses, divisions, teachers, academicYears] = await Promise.all([
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("status", "active"),
      supabase
        .from("courses")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId),
      supabase
        .from("divisions")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("role", "teacher"),
      supabase
        .from("academic_years")
        .select("name")
        .eq("school_id", schoolId)
        .eq("active", true)
        .maybeSingle(),
    ])

    if (students.error) throw new Error(`Error counting students: ${students.error.message}`)
    if (courses.error) throw new Error(`Error counting courses: ${courses.error.message}`)
    if (divisions.error) throw new Error(`Error counting divisions: ${divisions.error.message}`)
    if (teachers.error) throw new Error(`Error counting teachers: ${teachers.error.message}`)
    if (academicYears.error) throw new Error(`Error fetching academic year: ${academicYears.error.message}`)

    return {
      studentsCount: students.count ?? 0,
      coursesCount: courses.count ?? 0,
      divisionsCount: divisions.count ?? 0,
      teachersCount: teachers.count ?? 0,
      activeAcademicYear: academicYears.data?.name ?? null,
    }
  }
}
