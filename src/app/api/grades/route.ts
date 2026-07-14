import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { grades } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      student_id,
      subject_id,
      division_id,
      school_id,
      academic_year_id,
      partial_1,
      final_1,
      partial_2,
      final_2,
    } = body

    if (!student_id || !subject_id || !division_id || !school_id || !academic_year_id) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const validPartials = ["TEA", "TEP", "TED", null]
    const sanitized = {
      studentId: student_id,
      subjectId: subject_id,
      divisionId: division_id,
      schoolId: school_id,
      academicYearId: academic_year_id,
      partial1: validPartials.includes(partial_1) ? partial_1 : null,
      final1: final_1 !== undefined && final_1 !== "" && final_1 !== null
        ? parseFloat(final_1) : null,
      partial2: validPartials.includes(partial_2) ? partial_2 : null,
      final2: final_2 !== undefined && final_2 !== "" && final_2 !== null
        ? parseFloat(final_2) : null,
      updatedBy: session.user.id,
    }

    const [existing] = await db
      .select({ id: grades.id })
      .from(grades)
      .where(
        eq(grades.studentId, student_id) &&
        eq(grades.subjectId, subject_id) &&
        eq(grades.divisionId, division_id) &&
        eq(grades.academicYearId, academic_year_id)
      )
      .limit(1)

    let data
    if (existing) {
      const rows = await db
        .update(grades)
        .set(sanitized)
        .where(eq(grades.id, existing.id))
        .returning()
      data = rows[0]
    } else {
      const rows = await db.insert(grades).values(sanitized).returning()
      data = rows[0]
    }

    return NextResponse.json({ grade: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}
