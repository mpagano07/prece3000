import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { hashPassword } from "better-auth/crypto"

export async function POST(request: Request) {
  try {
    const { action, email, password } = await request.json()

    if (action === "reset-password") {
      if (!email || !password) {
        return NextResponse.json(
          { error: "email y password son requeridos" },
          { status: 400 }
        )
      }

      const url = process.env.DATABASE_URL
      if (!url) throw new Error("DATABASE_URL not set")

      const sql = neon(url)
      const hashed = await hashPassword(password)
      const result = await sql`UPDATE "user" SET password = ${hashed} WHERE email = ${email} RETURNING id, email`

      if (!result.length) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
      }

      return NextResponse.json({ message: "Contraseña actualizada", userId: result[0].id })
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    )
  }
}
