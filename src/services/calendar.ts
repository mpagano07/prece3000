"use server"

import { db } from "@/lib/db"
import { calendarEvents } from "@/lib/db/schema"
import { eq, and, gte, lte } from "drizzle-orm"
import type { CalendarEvent } from "@/types/database"

export async function getAllEvents(
  schoolId: string,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  return db.query.calendarEvents.findMany({
    where: and(
      eq(calendarEvents.schoolId, schoolId),
      gte(calendarEvents.startDate, new Date(startDate)),
      lte(calendarEvents.startDate, new Date(endDate))
    ),
    orderBy: (t, { asc }) => [asc(t.startDate)],
  }) as Promise<CalendarEvent[]>
}

export async function createEvent(
  schoolId: string,
  data: {
    title: string
    description?: string
    start_date: string
    end_date?: string
    type: string
    all_day?: boolean
  },
  userId: string
): Promise<CalendarEvent> {
  const rows = await db
    .insert(calendarEvents)
    .values({
      schoolId,
      title: data.title,
      description: data.description ?? null,
      startDate: new Date(data.start_date),
      endDate: data.end_date ? new Date(data.end_date) : null,
      type: data.type as CalendarEvent["type"],
      allDay: data.all_day ?? false,
      createdBy: userId,
    })
    .returning()

  return rows[0] as CalendarEvent
}

export async function updateEvent(
  id: string,
  data: Partial<{
    title: string
    description: string
    start_date: string
    end_date: string
    type: string
    all_day: boolean
  }>
): Promise<CalendarEvent> {
  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.start_date !== undefined) updateData.startDate = new Date(data.start_date)
  if (data.end_date !== undefined) updateData.endDate = data.end_date ? new Date(data.end_date) : null
  if (data.type !== undefined) updateData.type = data.type
  if (data.all_day !== undefined) updateData.allDay = data.all_day

  const rows = await db
    .update(calendarEvents)
    .set(updateData)
    .where(eq(calendarEvents.id, id))
    .returning()

  return rows[0] as CalendarEvent
}

export async function deleteEvent(id: string): Promise<void> {
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id))
}
