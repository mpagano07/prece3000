"use client"

import { useState, useMemo, useCallback } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  ArrowLeft,
  Check,
  X,
  Clock,
  DoorOpen,
  AlertCircle,
  Search,
  Loader2,
  Users,
} from "lucide-react"
import { cn, getInitials, formatDate } from "@/lib/utils"
import type { AttendanceStatus, Attendance } from "@/types/database"
import { useAuth } from "@/contexts/auth-context"
import { useCourses, useDivisions } from "@/hooks/use-courses"
import { useStudents } from "@/hooks/use-students"
import {
  useAttendance,
  useMarkAttendance,
  useMarkBulkAttendance,
} from "@/hooks/use-attendance"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const STATUS_CONFIG = {
  present: {
    label: "Presente",
    color:
      "border-green-500 text-green-700 bg-green-50 hover:bg-green-100 data-[selected=true]:bg-green-500 data-[selected=true]:text-white data-[selected=true]:border-green-500 dark:bg-green-950/20 dark:text-green-400 dark:data-[selected=true]:bg-green-600",
    icon: Check,
  },
  absent: {
    label: "Ausente",
    color:
      "border-red-500 text-red-700 bg-red-50 hover:bg-red-100 data-[selected=true]:bg-red-500 data-[selected=true]:text-white data-[selected=true]:border-red-500 dark:bg-red-950/20 dark:text-red-400 dark:data-[selected=true]:bg-red-600",
    icon: X,
  },
  absent_justified: {
    label: "Ausente Justif.",
    color:
      "border-yellow-500 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 data-[selected=true]:bg-yellow-500 data-[selected=true]:text-white data-[selected=true]:border-yellow-500 dark:bg-yellow-950/20 dark:text-yellow-400 dark:data-[selected=true]:bg-yellow-600",
    icon: AlertCircle,
  },
  late: {
    label: "Tardanza",
    color:
      "border-orange-500 text-orange-700 bg-orange-50 hover:bg-orange-100 data-[selected=true]:bg-orange-500 data-[selected=true]:text-white data-[selected=true]:border-orange-500 dark:bg-orange-950/20 dark:text-orange-400 dark:data-[selected=true]:bg-orange-600",
    icon: Clock,
  },
  early_withdrawal: {
    label: "Retiro Antic.",
    color:
      "border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100 data-[selected=true]:bg-blue-500 data-[selected=true]:text-white data-[selected=true]:border-blue-500 dark:bg-blue-950/20 dark:text-blue-400 dark:data-[selected=true]:bg-blue-600",
    icon: DoorOpen,
  },
} as const

interface StudentRecord {
  studentId: string
  firstName: string
  lastName: string
  dni: string
  photoUrl: string | null
  status: AttendanceStatus | null
  observation: string | null
  attendanceId: string | null
}

export default function AttendanceTakingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isLoading: authLoading } = useAuth()

  const courseId = params.courseId as string
  const divisionId = searchParams.get("division") ?? ""
  const date = searchParams.get("date") ?? format(new Date(), "yyyy-MM-dd")

  const [searchQuery, setSearchQuery] = useState("")
  const [pendingStudents, setPendingStudents] = useState<Set<string>>(new Set())
  const [expandedObs, setExpandedObs] = useState<Set<string>>(new Set())

  const { data: courses } = useCourses()
  const { data: divisions } = useDivisions(courseId)
  const { data: students, isLoading: studentsLoading } =
    useStudents(divisionId)
  const { data: attendanceRecords, isLoading: attendanceLoading } =
    useAttendance(divisionId, date)

  const markAttendance = useMarkAttendance()
  const markBulkAttendance = useMarkBulkAttendance()

  const course = useMemo(
    () => courses?.find((c) => c.id === courseId),
    [courses, courseId]
  )
  const division = useMemo(
    () => divisions?.find((d) => d.id === divisionId),
    [divisions, divisionId]
  )

  const attendanceMap = useMemo(() => {
    const map = new Map<string, Attendance>()
    if (attendanceRecords) {
      for (const record of attendanceRecords) {
        map.set(record.student_id, record)
      }
    }
    return map
  }, [attendanceRecords])

  const studentsWithAttendance = useMemo((): StudentRecord[] => {
    if (!students) return []
    return students.map((s) => {
      const attendance = attendanceMap.get(s.id)
      return {
        studentId: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        dni: s.dni,
        photoUrl: s.photo_url,
        status: attendance?.status ?? null,
        observation: attendance?.observation ?? null,
        attendanceId: attendance?.id ?? null,
      }
    })
  }, [students, attendanceMap])

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return studentsWithAttendance
    const q = searchQuery.toLowerCase()
    return studentsWithAttendance.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.dni.includes(q)
    )
  }, [studentsWithAttendance, searchQuery])

  const handleMarkStatus = useCallback(
    (studentId: string, status: AttendanceStatus) => {
      setPendingStudents((prev) => new Set(prev).add(studentId))

      markAttendance.mutate(
        {
          student_id: studentId,
          division_id: divisionId,
          date,
          status,
        },
        {
          onSettled: () => {
            setPendingStudents((prev) => {
              const next = new Set(prev)
              next.delete(studentId)
              return next
            })
          },
        }
      )
    },
    [divisionId, date, markAttendance]
  )

  const handleMarkAllPresent = useCallback(() => {
    if (!students || students.length === 0) return

    const studentIds = new Set(students.map((s) => s.id))
    setPendingStudents((prev) => new Set([...prev, ...studentIds]))

    markBulkAttendance.mutate(
      {
        divisionId,
        date,
        records: students.map((s) => ({
          student_id: s.id,
          status: "present" as AttendanceStatus,
        })),
      },
      {
        onSettled: () => {
          setPendingStudents(new Set())
        },
      }
    )
  }, [students, divisionId, date, markBulkAttendance])

  const toggleObservation = (studentId: string) => {
    setExpandedObs((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const handleObservationChange = useCallback(
    (studentId: string, observation: string) => {
      const record = attendanceMap.get(studentId)
      if (!record) return
      setPendingStudents((prev) => new Set(prev).add(studentId))
      markAttendance.mutate(
        {
          student_id: studentId,
          division_id: divisionId,
          date,
          status: record.status,
          observation,
        },
        {
          onSettled: () => {
            setPendingStudents((prev) => {
              const next = new Set(prev)
              next.delete(studentId)
              return next
            })
          },
        }
      )
    },
    [divisionId, date, attendanceMap, markAttendance]
  )

  if (authLoading) return <LoadingScreen />

  if (!divisionId || !date) {
    return (
      <EmptyState
        icon={<Users className="size-12" />}
        title="Parámetros incompletos"
        description="Seleccione una división y fecha para tomar asistencia"
        action={{
          label: "Volver",
          onClick: () => router.push("/attendance"),
        }}
      />
    )
  }

  const isSaving = markAttendance.isPending || markBulkAttendance.isPending

  const markedCount = studentsWithAttendance.filter((s) => s.status !== null).length

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/attendance")}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {course?.name ?? "Cargando..."} - {division?.name ?? ""}
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatDate(date)}
              {division?.shift && ` · Turno ${division.shift}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {markedCount}/{studentsWithAttendance.length} marcados
          </Badge>
          {isSaving && (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="size-3 animate-spin" />
              Guardando...
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar alumno por nombre o DNI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          onClick={handleMarkAllPresent}
          disabled={!students || students.length === 0 || isSaving}
        >
          <Check className="size-4" />
          Marcar todos Presente
        </Button>
      </div>

      {studentsLoading || attendanceLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={<Users className="size-12" />}
          title={
            searchQuery
              ? "Sin resultados"
              : "No hay alumnos en esta división"
          }
          description={
            searchQuery
              ? `No se encontraron alumnos que coincidan con "${searchQuery}"`
              : "Agregue alumnos a la división para tomar asistencia"
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student) => {
            const isPending = pendingStudents.has(student.studentId)
            const showObs = expandedObs.has(student.studentId)

            return (
              <div
                key={student.studentId}
                className={cn(
                  "rounded-xl border p-3 transition-colors sm:p-4",
                  isPending && "opacity-60 pointer-events-none"
                )}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(student.firstName, student.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {student.lastName}, {student.firstName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        DNI: {student.dni}
                      </p>
                    </div>
                    {isPending && (
                      <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(Object.entries(STATUS_CONFIG) as [AttendanceStatus, typeof STATUS_CONFIG['present']][]).map(
                      ([status, config]) => {
                        const isSelected = student.status === status
                        const Icon = config.icon
                        return (
                          <button
                            key={status}
                            type="button"
                            data-selected={isSelected}
                            onClick={() => handleMarkStatus(student.studentId, status)}
                            disabled={isPending}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all",
                              "sm:px-3 sm:py-2 sm:text-sm",
                              config.color,
                              isSelected && "ring-2 ring-offset-1"
                            )}
                          >
                            <Icon className="size-3.5 sm:size-4" />
                            <span className="hidden sm:inline">
                              {config.label}
                            </span>
                          </button>
                        )
                      }
                    )}

                    {student.status && (
                      <button
                        type="button"
                        onClick={() => toggleObservation(student.studentId)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors sm:px-3 sm:py-2 sm:text-sm"
                      >
                        {student.observation ? "Editar Obs." : "Obs."}
                      </button>
                    )}
                  </div>

                  {showObs && student.status && (
                    <div className="pt-1">
                      <textarea
                        className="w-full rounded-lg border border-input bg-transparent p-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm"
                        rows={2}
                        placeholder="Agregar observación..."
                        defaultValue={student.observation ?? ""}
                        onBlur={(e) => {
                          const val = e.target.value.trim()
                          if (val !== (student.observation ?? "")) {
                            handleObservationChange(student.studentId, val || "")
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
