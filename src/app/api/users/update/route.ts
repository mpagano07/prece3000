import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { profiles, preceptorSchools, teacherSchools, user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const { user_id, first_name, last_name, email, school_ids, role } = await request.json()

    if (!user_id) {
      return NextResponse.json(
        { error: "Se requiere user_id" },
        { status: 400 }
      )
    }

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Get current profile to know the role
    const [currentProfile] = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, user_id))
      .limit(1)

    const effectiveRole = role ?? currentProfile?.role

    // Update name in profiles table
    if (first_name !== undefined || last_name !== undefined || email !== undefined) {
      const nameUpdate: Record<string, string> = {}
      if (first_name !== undefined && first_name !== "") nameUpdate.firstName = first_name
      if (last_name !== undefined && last_name !== "") nameUpdate.lastName = last_name
      if (email !== undefined && email !== "") nameUpdate.email = email

      if (Object.keys(nameUpdate).length > 0) {
        await db
          .update(profiles)
          .set(nameUpdate)
          .where(eq(profiles.id, user_id))
      }

      // Also update the Better Auth user table
      const authUpdates: Record<string, string> = {}
      if (first_name !== undefined && first_name !== "" && last_name !== undefined && last_name !== "") {
        authUpdates.name = `${first_name} ${last_name}`
      }
      if (email !== undefined && email !== "") authUpdates.email = email

      if (Object.keys(authUpdates).length > 0) {
        await db
          .update(user)
          .set(authUpdates)
          .where(eq(user.id, user_id))
      }
    }

    if (school_ids && school_ids.length > 0) {
      await db
        .update(profiles)
        .set({ schoolId: school_ids[0] })
        .where(eq(profiles.id, user_id))

      // Only update junction tables that match the effective role
      if (effectiveRole === "preceptor") {
        await db
          .delete(preceptorSchools)
          .where(eq(preceptorSchools.preceptorId, user_id))

        await db.insert(preceptorSchools).values(
          school_ids.map((sid: string) => ({
            preceptorId: user_id,
            schoolId: sid,
          }))
        )
      }

      if (effectiveRole === "teacher") {
        await db
          .delete(teacherSchools)
          .where(eq(teacherSchools.teacherId, user_id))

        await db.insert(teacherSchools).values(
          school_ids.map((sid: string) => ({
            teacherId: user_id,
            schoolId: sid,
          }))
        )
      }
    }

    if (role) {
      // If role changed, clean up old junction table entries
      if (currentProfile && currentProfile.role !== role) {
        if (currentProfile.role === "preceptor") {
          await db
            .delete(preceptorSchools)
            .where(eq(preceptorSchools.preceptorId, user_id))
        }
        if (currentProfile.role === "teacher") {
          await db
            .delete(teacherSchools)
            .where(eq(teacherSchools.teacherId, user_id))
        }
      }

      await db
        .update(profiles)
        .set({ role: role as "super_admin" | "school_admin" | "director" | "preceptor" | "secretary" | "teacher" })
        .where(eq(profiles.id, user_id))
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}
