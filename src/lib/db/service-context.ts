import "server-only"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { headers } from "next/headers"
import { cookies } from "next/headers"

export async function getServiceContext() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    throw new Error("Not authenticated")
  }

  const userId = session.user.id

  const cookieStore = await cookies()
  const schoolId = cookieStore.get("activeSchoolId")?.value ?? null

  return { db, userId, schoolId }
}
