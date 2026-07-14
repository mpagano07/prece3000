"use server"

import { db } from "@/lib/db"
import { appointments } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function getAppointments(userId: string) {
  return db.query.appointments.findMany({
    where: eq(appointments.userId, userId),
    orderBy: (t, { asc }) => [asc(t.startDate)],
  })
}

export async function createAppointment(data: {
  schoolId: string
  userId: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  type: string
}) {
  const rows = await db.insert(appointments).values({
    schoolId: data.schoolId,
    userId: data.userId,
    title: data.title,
    description: data.description,
    startDate: new Date(data.startDate),
    endDate: data.endDate ? new Date(data.endDate) : null,
    type: data.type,
  }).returning()
  return rows[0]
}

export async function toggleAppointment(id: string) {
  const current = await db.query.appointments.findFirst({
    where: eq(appointments.id, id),
  })

  if (!current) throw new Error("Appointment not found")

  await db.update(appointments).set({ completed: !current.completed }).where(eq(appointments.id, id))
}
