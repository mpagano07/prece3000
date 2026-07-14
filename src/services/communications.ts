"use server"

import { db } from "@/lib/db"
import { communications } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { Communication, CommunicationType } from "@/types/database"

export async function createCommunication(
  schoolId: string,
  data: {
    studentId: string
    type: CommunicationType
    message: string
    sentTo: string
  }
): Promise<Communication> {
  const rows = await db
    .insert(communications)
    .values({
      schoolId,
      studentId: data.studentId,
      type: data.type,
      message: data.message,
      sentTo: data.sentTo,
      sentAt: new Date(),
      status: "sent",
    })
    .returning()

  return rows[0] as Communication
}

export async function getCommunicationsByStudent(studentId: string): Promise<Communication[]> {
  return db.query.communications.findMany({
    where: eq(communications.studentId, studentId),
    orderBy: (t, { desc }) => [desc(t.sentAt)],
  }) as Promise<Communication[]>
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/[^\d]/g, "")
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${cleaned}?text=${encoded}`
}

export function generateMailTo(email: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body })
  return `mailto:${email}?${params.toString()}`
}
