import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { academicYears } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const { school_id, name, start_date, end_date } = await request.json()

    if (!school_id || !name || !start_date || !end_date) {
      return NextResponse.json(
        { error: "school_id, name, start_date y end_date son requeridos" },
        { status: 400 }
      )
    }

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const [existingActive] = await db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(and(eq(academicYears.schoolId, school_id), eq(academicYears.active, true)))
      .limit(1)

    const rows = await db
      .insert(academicYears)
      .values({
        schoolId: school_id,
        name,
        startDate: start_date,
        endDate: end_date,
        active: !existingActive,
      })
      .returning()

    return NextResponse.json({ success: true, academic_year: rows[0] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, active, name, start_date, end_date } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Se requiere id" }, { status: 400 })
    }

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    if (active === true) {
      const [ay] = await db
        .select({ schoolId: academicYears.schoolId })
        .from(academicYears)
        .where(eq(academicYears.id, id))
        .limit(1)

      if (ay) {
        await db
          .update(academicYears)
          .set({ active: false })
          .where(
            and(eq(academicYears.schoolId, ay.schoolId), eq(academicYears.active, true))
          )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (active !== undefined) updateData.active = active
    if (name !== undefined) updateData.name = name
    if (start_date !== undefined) updateData.startDate = start_date
    if (end_date !== undefined) updateData.endDate = end_date

    const rows = await db
      .update(academicYears)
      .set(updateData)
      .where(eq(academicYears.id, id))
      .returning()

    return NextResponse.json({ success: true, academic_year: rows[0] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Se requiere id" }, { status: 400 })
    }

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    await db.delete(academicYears).where(eq(academicYears.id, id))

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}
