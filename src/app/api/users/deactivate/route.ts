import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { profiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const { user_id } = await request.json()

    if (!user_id) {
      return NextResponse.json({ error: "user_id es requerido" }, { status: 400 })
    }

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    await auth.api.banUser({
      body: { userId: user_id, banReason: "Deactivated by admin" },
    })

    await db
      .update(profiles)
      .set({ schoolId: null, deactivatedAt: new Date() })
      .where(eq(profiles.id, user_id))

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}
