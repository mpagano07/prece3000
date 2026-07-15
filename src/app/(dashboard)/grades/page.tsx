"use client"

import { useState, useMemo, useCallback, Fragment } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { useCourses } from "@/hooks/use-courses"
import { useActiveAcademicYear } from "@/hooks/use-academic-years"
import { getDivisions } from "@/services/courses"
import { getAllStudents, getSubjectsForDivision } from "@/services/students"
import { getGradesByDivision } from "@/services/grades"
import { PageHeader } from "@/components/shared/page-header"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { EmptyState } from "@/components/shared/empty-state"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  GraduationCap,
  Users,
  ShieldAlert,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react"
import type { Grade } from "@/types/database"

const PARTIAL_OPTIONS = [
  { value: "TEA", label: "TEA", color: "text-blue-600 bg-blue-50" },
  { value: "TEP", label: "TEP", color: "text-green-600 bg-green-50" },
  { value: "TED", label: "TED", color: "text-red-600 bg-red-50" },
] as const

type GradeField = "partial1" | "final1" | "partial2" | "final2"
const FIELDS: GradeField[] = ["partial1", "final1", "partial2", "final2"]
const FIELD_LABELS: Record<GradeField, string> = {
  partial1: "P1", final1: "F1",
  partial2: "P2", final2: "F2",
}

function getGradeValue(grade: Grade | undefined, field: GradeField): string {
  if (!grade) return ""
  if (field === "partial1") return grade.partial1 ?? ""
  if (field === "final1") return grade.final1?.toString() ?? ""
  if (field === "partial2") return grade.partial2 ?? ""
  if (field === "final2") return grade.final2?.toString() ?? ""
  return ""
}

export default function GradesPage() {
  const { profile, school } = useAuth()
  const queryClient = useQueryClient()
  const [courseId, setCourseId] = useState("")
  const [divisionId, setDivisionId] = useState("")
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<string | null>(null)

  const role = profile?.role
  const canView = !!role
  const canEdit = role === "teacher" || role === "super_admin"

  const { data: courses, isLoading: coursesLoading } = useCourses()
  const { data: activeAcademicYear } = useActiveAcademicYear()

  const { data: divisions, isLoading: divisionsLoading } = useQuery({
    queryKey: ["divisions", courseId],
    queryFn: () => getDivisions(courseId),
    enabled: !!courseId,
  })

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["students", school?.id, divisionId],
    queryFn: () => getAllStudents(school!.id, divisionId),
    enabled: !!school?.id && !!divisionId,
  })

  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ["division-subjects", divisionId],
    queryFn: () => getSubjectsForDivision(divisionId),
    enabled: !!divisionId,
  })

  const { data: grades, isLoading: gradesLoading } = useQuery({
    queryKey: ["grades", school?.id, divisionId],
    queryFn: () => getGradesByDivision(divisionId),
    enabled: !!school?.id && !!divisionId,
  })

  const saveMutation = useMutation({
    mutationFn: async ({
      studentId,
      subjectId,
      field,
      value,
    }: {
      studentId: string
      subjectId: string
      field: GradeField
      value: string
    }) => {
      if (!activeAcademicYear?.id) throw new Error("No hay un año académico activo")

      const key = `${studentId}_${subjectId}`
      const existing = gradeMap.get(key)

      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          subject_id: subjectId,
          division_id: divisionId,
          school_id: school!.id,
          academic_year_id: activeAcademicYear.id,
          partial_1: field === "partial1" ? value : existing?.partial1 ?? null,
          final_1: field === "final1" ? value : existing?.final1 ?? null,
          partial_2: field === "partial2" ? value : existing?.partial2 ?? null,
          final_2: field === "final2" ? value : existing?.final2 ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades", school?.id, divisionId] })
      toast.success("Calificación guardada")
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al guardar calificación")
    },
  })

  const gradeMap = useMemo(() => {
    const map = new Map<string, Grade>()
    for (const g of grades ?? []) {
      map.set(`${g.studentId}_${g.subjectId}`, g)
    }
    return map
  }, [grades])

  const isLoading =
    coursesLoading || divisionsLoading || studentsLoading || subjectsLoading || gradesLoading

  const handlePartialSelect = useCallback(
    (studentId: string, subjectId: string, field: GradeField, value: string) => {
      saveMutation.mutate({ studentId: studentId, subjectId: subjectId, field, value })
    },
    [saveMutation]
  )

  const handleFinalSave = useCallback(
    (studentId: string, subjectId: string, field: GradeField, rawValue: string) => {
      setEditingCell(null)
      if (rawValue === "") {
        saveMutation.mutate({ studentId: studentId, subjectId: subjectId, field, value: "" })
        return
      }
      const num = parseFloat(rawValue)
      if (isNaN(num)) { toast.error("Ingresá un número válido"); return }
      if (num < 0 || num > 10) { toast.error("La calificación debe ser entre 0 y 10"); return }
      saveMutation.mutate({ studentId: studentId, subjectId: subjectId, field, value: rawValue })
    },
    [saveMutation]
  )

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="mb-4 size-12 text-muted-foreground" />
        <h3 className="text-sm font-medium">Acceso restringido</h3>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calificaciones"
        description="Gestión de calificaciones por curso y división"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Select
          value={courseId}
          onValueChange={(v) => { setCourseId(v); setDivisionId("") }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Seleccionar curso" />
          </SelectTrigger>
          <SelectContent>
            {(courses ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={divisionId}
          onValueChange={(v) => setDivisionId(v)}
          disabled={!courseId}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Seleccionar división" />
          </SelectTrigger>
          <SelectContent>
            {(divisions ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingScreen />}

      {!isLoading && !divisionId && (
        <EmptyState
          icon={<GraduationCap className="size-12" />}
          title="Seleccioná un curso y división"
          description="Elegí un curso y una división para ver las calificaciones"
        />
      )}

      {!isLoading && divisionId && subjects?.length === 0 && (
        <EmptyState
          icon={<ClipboardCheck className="size-12" />}
          title="Sin materias asignadas"
          description="Esta división no tiene materias asignadas en los horarios"
        />
      )}

      {!isLoading && divisionId && students?.length === 0 && (
        <EmptyState
          icon={<Users className="size-12" />}
          title="Sin alumnos"
          description="No hay alumnos activos en esta división"
        />
      )}

      {!isLoading && divisionId && students && students.length > 0 && subjects && subjects.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[250px]">Alumno</TableHead>
                <TableHead className="w-[140px] text-muted-foreground font-normal">
                  {expandedStudent ? "P1 · F1 · P2 · F2" : `${subjects.length} materias`}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const isExpanded = expandedStudent === student.id
                return (
                  <Fragment key={student.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <ChevronRight
                            className={`size-4 text-muted-foreground transition-transform ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          />
                          {student.lastName}, {student.firstName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {isExpanded ? "▲ expandido" : "▼ expandir"}
                        </span>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={2} className="p-0 border-t-0">
                          <div className="bg-muted/20 px-4 pb-3 pt-2">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="h-8 text-xs font-medium min-w-[180px]">
                                    Materia
                                  </TableHead>
                                  {FIELDS.map((f) => (
                                    <TableHead
                                      key={f}
                                      className="h-8 text-center text-[10px] text-muted-foreground font-normal w-[72px]"
                                    >
                                      {FIELD_LABELS[f]}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {subjects.map((subject) => {
                                  const grade = gradeMap.get(`${student.id}_${subject.id}`)
                                  return (
                                    <TableRow key={subject.id}>
                                      <TableCell className="h-9 py-1 text-xs font-medium">
                                        {subject.name}
                                      </TableCell>
                                      {FIELDS.map((field) => {
                                        const cellKey = `${student.id}_${subject.id}_${field}`
                                        const isEditing = editingCell === cellKey
                                        const isPartial = field === "partial1" || field === "partial2"
                                        const val = getGradeValue(grade, field)

                                        if (isPartial) {
                                          return (
                                            <TableCell key={field} className="h-9 py-1 text-center">
                                              {canEdit ? (
                                                <Select
                                                  value={val}
                                                  onValueChange={(v) =>
                                                    handlePartialSelect(student.id, subject.id, field, v)
                                                  }
                                                >
                                                  <SelectTrigger className="h-7 w-[68px] mx-auto text-xs border-0 shadow-none hover:bg-accent">
                                                    <SelectValue placeholder="—">
                                                      {val ? (
                                                        <span className={`text-xs font-semibold ${
                                                          val === "TEA" ? "text-blue-600" :
                                                          val === "TEP" ? "text-green-600" :
                                                          "text-red-600"
                                                        }`}>{val}</span>
                                                      ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                      )}
                                                    </SelectValue>
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {PARTIAL_OPTIONS.map((o) => (
                                                      <SelectItem key={o.value} value={o.value}>
                                                        <span className={`font-semibold text-xs ${
                                                          o.value === "TEA" ? "text-blue-600" :
                                                          o.value === "TEP" ? "text-green-600" :
                                                          "text-red-600"
                                                        }`}>{o.value}</span>
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              ) : val ? (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                  val === "TEA" ? "text-blue-600 bg-blue-50" :
                                                  val === "TEP" ? "text-green-600 bg-green-50" :
                                                  "text-red-600 bg-red-50"
                                                }`}>{val}</span>
                                              ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                              )}
                                            </TableCell>
                                          )
                                        }

                                        return (
                                          <TableCell key={field} className="h-9 py-1 text-center">
                                            {isEditing ? (
                                              <Input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                max="10"
                                                className="h-7 w-[68px] mx-auto text-center text-xs"
                                                defaultValue={val}
                                                autoFocus
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") {
                                                    handleFinalSave(student.id, subject.id, field, (e.target as HTMLInputElement).value)
                                                  }
                                                  if (e.key === "Escape") setEditingCell(null)
                                                }}
                                                onBlur={(e) =>
                                                  handleFinalSave(student.id, subject.id, field, e.target.value)
                                                }
                                              />
                                            ) : (
                                              <span
                                                className={`text-xs tabular-nums cursor-pointer ${
                                                  val ? "font-medium" : "text-muted-foreground"
                                                }`}
                                                onClick={() => {
                                                  if (canEdit) setEditingCell(cellKey)
                                                }}
                                              >
                                                {val || "—"}
                                              </span>
                                            )}
                                          </TableCell>
                                        )
                                      })}
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
