import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const { user_id, school_id } = await request.json()

    if (!user_id) {
      return NextResponse.json({ error: "user_id es requerido" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Unban in Auth (remove 24h ban)
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {})

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    // Clear deactivated_at and restore school_id if provided
    const updates: Record<string, string | null> = { deactivated_at: null }
    if (school_id) {
      updates.school_id = school_id
    }

    const { error } = await adminClient
      .from("profiles")
      .update(updates)
      .eq("id", user_id)

    if (error) {
      return NextResponse.json({ error: "Error al reactivar usuario" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Reactivate error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
