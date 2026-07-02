import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type {
  Student,
  StudentGuardian,
  AuthorizedPerson,
  Attendance,
  PreceptorBookEntry,
  Communication,
  Document,
} from "@/types/database"

export class StudentService {
  static async getAll(
    supabase: SupabaseClient,
    schoolId: string,
    divisionId?: string,
    academicYearId?: string
  ): Promise<Student[]> {
    let query = supabase
      .from("students")
      .select("*")
      .eq("school_id", schoolId)
      .eq("status", "active")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })

    if (divisionId) {
      query = query.eq("division_id", divisionId)
    }

    if (academicYearId) {
      query = query.eq("academic_year_id", academicYearId)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error fetching students: ${error.message}`)
    return data ?? []
  }

  static async getById(supabase: SupabaseClient, id: string): Promise<Student | null> {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw new Error(`Error fetching student: ${error.message}`)
    return data
  }

  static async create(
    supabase: SupabaseClient,
    data: {
      school_id: string
      division_id?: string | null
      first_name: string
      last_name: string
      dni: string
      birth_date?: string | null
      gender?: string | null
      nationality?: string | null
      address?: string | null
      phone?: string | null
      email?: string | null
      photo_url?: string | null
      blood_type?: string | null
      health_insurance?: string | null
      health_affiliate_number?: string | null
      doctor_name?: string | null
      doctor_phone?: string | null
      allergies?: string | null
      medication?: string | null
      restrictions?: string | null
      observations?: string | null
      academic_year_id?: string | null
      guardians?: Omit<StudentGuardian, "id" | "student_id">[]
      authorized_persons?: Omit<AuthorizedPerson, "id" | "student_id">[]
    }
  ): Promise<Student> {
    const { guardians, authorized_persons, ...raw } = data

    const studentData = Object.fromEntries(
      Object.entries(raw).map(([key, val]) => [key, val === "" ? null : val])
    )

    const { data: student, error } = await supabase
      .from("students")
      .insert({
        ...studentData,
        status: "active",
      })
      .select()
      .single()

    if (error) throw new Error(`Error creating student: ${error.message}`)

    if (guardians && guardians.length > 0) {
      const { error: guardiansError } = await supabase.from("student_guardians").insert(
        guardians.map((g) => ({ ...g, student_id: student.id }))
      )

      if (guardiansError) {
        throw new Error(`Error creating guardians: ${guardiansError.message}`)
      }
    }

    if (authorized_persons && authorized_persons.length > 0) {
      const { error: personsError } = await supabase.from("authorized_persons").insert(
        authorized_persons.map((p) => ({ ...p, student_id: student.id }))
      )

      if (personsError) {
        throw new Error(`Error creating authorized persons: ${personsError.message}`)
      }
    }

    return student
  }

  static async update(
    supabase: SupabaseClient,
    id: string,
    data: Partial<Omit<Student, "id" | "created_at" | "updated_at">> & {
      guardians?: Omit<StudentGuardian, "id" | "student_id">[]
      authorized_persons?: Omit<AuthorizedPerson, "id" | "student_id">[]
    }
  ): Promise<Student> {
    const { guardians, authorized_persons, ...studentData } = data

    const cleaned = Object.fromEntries(
      Object.entries(studentData).map(([key, val]) => [key, val === "" ? null : val])
    )

    const { data: student, error } = await supabase
      .from("students")
      .update(cleaned)
      .eq("id", id)
      .select()
      .single()

    if (error) throw new Error(`Error updating student: ${error.message}`)

    if (guardians !== undefined) {
      await supabase.from("student_guardians").delete().eq("student_id", id)

      if (guardians.length > 0) {
        const { error: gErr } = await supabase
          .from("student_guardians")
          .insert(guardians.map((g) => ({ ...g, student_id: id })))
        if (gErr) throw new Error(`Error updating guardians: ${gErr.message}`)
      }
    }

    if (authorized_persons !== undefined) {
      await supabase.from("authorized_persons").delete().eq("student_id", id)

      if (authorized_persons.length > 0) {
        const { error: aErr } = await supabase
          .from("authorized_persons")
          .insert(authorized_persons.map((p) => ({ ...p, student_id: id })))
        if (aErr) throw new Error(`Error updating authorized persons: ${aErr.message}`)
      }
    }

    return student
  }

  static async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase
      .from("students")
      .update({ status: "inactive" })
      .eq("id", id)

    if (error) throw new Error(`Error deleting student: ${error.message}`)
  }

  static async getGuardians(
    supabase: SupabaseClient,
    studentId: string
  ): Promise<StudentGuardian[]> {
    const { data, error } = await supabase
      .from("student_guardians")
      .select("*")
      .eq("student_id", studentId)
      .order("name")

    if (error) throw new Error(`Error fetching guardians: ${error.message}`)
    return data ?? []
  }

  static async addGuardian(
    supabase: SupabaseClient,
    studentId: string,
    data: Omit<StudentGuardian, "id" | "student_id">
  ): Promise<StudentGuardian> {
    const { data: guardian, error } = await supabase
      .from("student_guardians")
      .insert({ ...data, student_id: studentId })
      .select()
      .single()

    if (error) throw new Error(`Error adding guardian: ${error.message}`)
    return guardian
  }

  static async removeGuardian(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from("student_guardians").delete().eq("id", id)

    if (error) throw new Error(`Error removing guardian: ${error.message}`)
  }

  static async getAuthorizedPersons(
    supabase: SupabaseClient,
    studentId: string
  ): Promise<AuthorizedPerson[]> {
    const { data, error } = await supabase
      .from("authorized_persons")
      .select("*")
      .eq("student_id", studentId)
      .order("name")

    if (error) throw new Error(`Error fetching authorized persons: ${error.message}`)
    return data ?? []
  }

  static async addAuthorizedPerson(
    supabase: SupabaseClient,
    studentId: string,
    data: Omit<AuthorizedPerson, "id" | "student_id">
  ): Promise<AuthorizedPerson> {
    const { data: person, error } = await supabase
      .from("authorized_persons")
      .insert({ ...data, student_id: studentId })
      .select()
      .single()

    if (error) throw new Error(`Error adding authorized person: ${error.message}`)
    return person
  }

  static async removeAuthorizedPerson(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from("authorized_persons").delete().eq("id", id)

    if (error) throw new Error(`Error removing authorized person: ${error.message}`)
  }

  static async getStudentHistory(
    supabase: SupabaseClient,
    studentId: string
  ): Promise<{
    attendance: Attendance[]
    bookEntries: PreceptorBookEntry[]
    communications: Communication[]
    documents: Document[]
  }> {
    const [attendance, bookEntries, communications, documents] = await Promise.all([
      supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("preceptor_book")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),
      supabase
        .from("communications")
        .select("*")
        .eq("student_id", studentId)
        .order("sent_at", { ascending: false }),
      supabase
        .from("documents")
        .select("*")
        .eq("student_id", studentId)
        .order("uploaded_at", { ascending: false }),
    ])

    if (attendance.error) throw new Error(`Error fetching attendance: ${attendance.error.message}`)
    if (bookEntries.error) throw new Error(`Error fetching book entries: ${bookEntries.error.message}`)
    if (communications.error) throw new Error(`Error fetching communications: ${communications.error.message}`)
    if (documents.error) throw new Error(`Error fetching documents: ${documents.error.message}`)

    return {
      attendance: attendance.data ?? [],
      bookEntries: bookEntries.data ?? [],
      communications: communications.data ?? [],
      documents: documents.data ?? [],
    }
  }

  static async uploadPhoto(
    supabase: SupabaseClient,
    studentId: string,
    file: File
  ): Promise<string> {
    const ext = file.name.split(".").pop()
    const filePath = `${studentId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("student-photos")
      .upload(filePath, file)

    if (uploadError) throw new Error(`Error uploading photo: ${uploadError.message}`)

    const { data: urlData } = supabase.storage.from("student-photos").getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from("students")
      .update({ photo_url: urlData.publicUrl })
      .eq("id", studentId)

    if (updateError) throw new Error(`Error updating student photo URL: ${updateError.message}`)

    return urlData.publicUrl
  }

  static async search(
    supabase: SupabaseClient,
    schoolId: string,
    query: string
  ): Promise<Student[]> {
    const searchTerm = `%${query}%`

    const { data, error } = await supabase
      .from("students")
      .select("*, divisions!inner(name, courses!inner(name))")
      .eq("school_id", schoolId)
      .eq("status", "active")
      .or(
        `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},dni.ilike.${searchTerm}`
      )
      .order("last_name", { ascending: true })
      .limit(20)

    if (error) throw new Error(`Error searching students: ${error.message}`)
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
  if (!profile?.school_id) throw new Error("No active school selected")
  return { supabase: client, userId: cachedUserId, schoolId: profile.school_id }
}

export const studentService = {
  async getAll(divisionId?: string) {
    const { supabase, schoolId } = await ensureContext()
    return StudentService.getAll(supabase, schoolId, divisionId)
  },
  async getById(id: string) {
    const { supabase } = await ensureContext()
    return StudentService.getById(supabase, id)
  },
  async create(data: Omit<Student, "id" | "created_at" | "updated_at">) {
    const { supabase } = await ensureContext()
    return StudentService.create(supabase, data as Parameters<typeof StudentService.create>[1])
  },
  async update(id: string, data: Partial<Student>) {
    const { supabase } = await ensureContext()
    return StudentService.update(supabase, id, data)
  },
  async getHistory(studentId: string) {
    const { supabase } = await ensureContext()
    return StudentService.getStudentHistory(supabase, studentId)
  },
  async search(query: string) {
    const { supabase, schoolId } = await ensureContext()
    return StudentService.search(supabase, schoolId, query)
  },
}
