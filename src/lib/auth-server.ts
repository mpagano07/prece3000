import { auth } from "./auth"
import { headers } from "next/headers"

export async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    throw new Error("Not authenticated")
  }

  return session
}

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  })
}
