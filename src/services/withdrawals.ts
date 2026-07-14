"use server"

import { db } from "@/lib/db"
import { withdrawals, students } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { format } from "date-fns"
import type { Withdrawal } from "@/types/database"

export async function getWithdrawalsByStudent(studentId: string): Promise<Withdrawal[]> {
  return db.query.withdrawals.findMany({
    where: eq(withdrawals.studentId, studentId),
    orderBy: (t, { desc: d }) => [d(t.createdAt)],
  }) as Promise<Withdrawal[]>
}

export async function createWithdrawal(
  schoolId: string,
  data: {
    studentId: string
    withdrawnBy: string
    document?: string
    observations?: string
    signature?: string
    date: string
    time: string
  }
): Promise<Withdrawal> {
  const rows = await db
    .insert(withdrawals)
    .values({
      schoolId,
      studentId: data.studentId,
      withdrawnBy: data.withdrawnBy,
      document: data.document ?? null,
      observations: data.observations ?? null,
      signature: data.signature ?? null,
      date: data.date,
      time: data.time,
    })
    .returning()

  return rows[0] as Withdrawal
}

export async function getTodayWithdrawals(schoolId: string, divisionId?: string) {
  const today = format(new Date(), "yyyy-MM-dd")

  const conditions = [
    eq(withdrawals.schoolId, schoolId),
    eq(withdrawals.date, today),
  ]

  const rows = await db.query.withdrawals.findMany({
    where: and(...conditions),
    orderBy: (t, { asc }) => [asc(t.time)],
  })

  return rows as (Withdrawal & {
    students: { firstName: string; lastName: string; dni: string } | null
  })[]
}
