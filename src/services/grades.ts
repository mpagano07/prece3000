"use server"

import { db } from "@/lib/db"
import { grades } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { Grade } from "@/types/database"

export async function getGradesWithStudents(schoolId: string) {
  const records = await db.query.grades.findMany({
    where: eq(grades.schoolId, schoolId),
    with: {
      student: { columns: { firstName: true, lastName: true, dni: true } },
      subject: { columns: { name: true } },
      updater: { columns: { firstName: true, lastName: true } },
    },
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
    limit: 200,
  })
  return records
}

export async function getGradesByDivision(divisionId: string): Promise<Grade[]> {
  return db.query.grades.findMany({
    where: eq(grades.divisionId, divisionId),
  }) as Promise<Grade[]>
}
