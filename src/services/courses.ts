import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Course, Division, DivisionWithCourse } from "@/types/database"

export class CourseService {
  static async getBySchool(
    supabase: SupabaseClient,
    schoolId: string,
    academicYearId?: string
  ): Promise<Course[]> {
    let query = supabase
      .from("courses")
      .select("*")
      .eq("school_id", schoolId)
      .order("name")

    if (academicYearId) {
      query = query.eq("academic_year_id", academicYearId)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error fetching courses: ${error.message}`)
    return data ?? []
  }

  static async getById(supabase: SupabaseClient, id: string): Promise<Course | null> {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw new Error(`Error fetching course: ${error.message}`)
    return data
  }

  static async create(
    supabase: SupabaseClient,
    data: Pick<Course, "school_id" | "name" | "academic_year_id">
  ): Promise<Course> {
    const { data: course, error } = await supabase
      .from("courses")
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(`Error creating course: ${error.message}`)
    return course
  }

  static async update(
    supabase: SupabaseClient,
    id: string,
    data: Partial<Pick<Course, "name" | "academic_year_id">>
  ): Promise<Course> {
    const { data: course, error } = await supabase
      .from("courses")
      .update(data)
      .eq("id", id)
      .select()
      .single()

    if (error) throw new Error(`Error updating course: ${error.message}`)
    return course
  }

  static async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from("courses").delete().eq("id", id)

    if (error) throw new Error(`Error deleting course: ${error.message}`)
  }

  static async getDivisions(supabase: SupabaseClient, courseId: string): Promise<DivisionWithCourse[]> {
    const { data, error } = await supabase
      .from("divisions")
      .select("*, course:courses(*)")
      .eq("course_id", courseId)
      .order("name")

    if (error) throw new Error(`Error fetching divisions: ${error.message}`)
    return data ?? []
  }

  static async createDivision(
    supabase: SupabaseClient,
    data: Pick<Division, "school_id" | "course_id" | "name" | "academic_year_id"> & {
      shift?: string | null
      preceptor_id?: string | null
    }
  ): Promise<Division> {
    const { data: division, error } = await supabase
      .from("divisions")
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(`Error creating division: ${error.message}`)
    return division
  }

  static async updateDivision(
    supabase: SupabaseClient,
    id: string,
    data: Partial<Pick<Division, "name" | "shift" | "preceptor_id">>
  ): Promise<Division> {
    const { data: division, error } = await supabase
      .from("divisions")
      .update(data)
      .eq("id", id)
      .select()
      .single()

    if (error) throw new Error(`Error updating division: ${error.message}`)
    return division
  }

  static async deleteDivision(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from("divisions").delete().eq("id", id)

    if (error) throw new Error(`Error deleting division: ${error.message}`)
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
  if (!profile?.school_id) throw new Error("No active school selected")
  return { supabase: client, userId: cachedUserId, schoolId: profile.school_id }
}

export const courseService = {
  async getAll(academicYearId?: string) {
    const { supabase, schoolId } = await ensureContext()
    return CourseService.getBySchool(supabase, schoolId, academicYearId)
  },
  async getDivisions(courseId: string) {
    const { supabase } = await ensureContext()
    return CourseService.getDivisions(supabase, courseId)
  },
  async create(data: Omit<Course, "id">) {
    const { supabase } = await ensureContext()
    return CourseService.create(supabase, data)
  },
  async createDivision(data: Parameters<typeof CourseService.createDivision>[1]) {
    const { supabase } = await ensureContext()
    return CourseService.createDivision(supabase, {
      ...data,
      shift: data.shift ?? undefined,
    })
  },
  async delete(id: string) {
    const { supabase } = await ensureContext()
    return CourseService.delete(supabase, id)
  },
  async updateDivision(id: string, data: Partial<Pick<Division, "name" | "shift" | "preceptor_id">>) {
    const { supabase } = await ensureContext()
    return CourseService.updateDivision(supabase, id, data)
  },
  async deleteDivision(id: string) {
    const { supabase } = await ensureContext()
    return CourseService.deleteDivision(supabase, id)
  },
}
