"use server"

import { cookies } from "next/headers"

const COOKIE_KEY = "activeSchoolId"

export async function getActiveSchoolId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_KEY)?.value ?? null
}

export async function setActiveSchoolId(id: string | null) {
  const cookieStore = await cookies()
  if (id) {
    cookieStore.set(COOKIE_KEY, id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    })
  } else {
    cookieStore.delete(COOKIE_KEY)
  }
}
