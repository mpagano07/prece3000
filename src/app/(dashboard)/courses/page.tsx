"use client"

import { useState, useMemo } from "react"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Plus,
  BookOpen,
  Layers,
  Trash2,
  Loader2,
  GraduationCap,
  Clock,
  Search,
  Users,
  UserRound,
  Check,
  ClipboardCheck,
  X,
  AlertCircle,
  DoorOpen,
} from "lucide-react"
import { format } from "date-fns"
import { cn, getInitials } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { useCourses, useDivisions, useCreateCourse, useCreateDivision, useUpdateDivision } from "@/hooks/use-courses"
import {
  useAttendance,
  useMarkAttendance,
  useMarkBulkAttendance,
} from "@/hooks/use-attendance"
import type { Attendance, AttendanceStatus } from "@/types/database"
import { courseService } from "@/services/courses"
import { useActiveAcademicYear } from "@/hooks/use-academic-years"
import { usePreceptors } from "@/hooks/use-preceptors"
import { useStudents } from "@/hooks/use-students"
import { PageHeader } from "@/components/shared/page-header"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Profile } from "@/types/database"

export default function CoursesPage() {
  const { school, profile, isLoading: authLoading } = useAuth()
  const queryClient = useQueryClient()

  const { data: courses, isLoading: coursesLoading } = useCourses()
  const { data: activeAcademicYear, isLoading: academicYearLoading } =
    useActiveAcademicYear()
  const { data: preceptors } = usePreceptors()
  const createCourse = useCreateCourse()
  const createDivision = useCreateDivision()
  const updateDivision = useUpdateDivision()
  const [courseDialogOpen, setCourseDialogOpen] = useState(false)
  const [divisionDialogOpen, setDivisionDialogOpen] = useState(false)
  const [courseForDivision, setCourseForDivision] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "course" | "division"
    id: string
    name: string
  } | null>(null)

  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false)
  const [attendanceDialogDivision, setAttendanceDialogDivision] = useState<{
    divisionId: string
    divisionName: string
    courseName: string
  } | null>(null)

  const [newCourseName, setNewCourseName] = useState("")
  const [newCourseDivisionName, setNewCourseDivisionName] = useState("")
  const [newCourseDivisionShift, setNewCourseDivisionShift] = useState("")
  const [newCourseDivisionPreceptor, setNewCourseDivisionPreceptor] = useState("")
  const [newDivisionName, setNewDivisionName] = useState("")
  const [newDivisionShift, setNewDivisionShift] = useState("")

  const canManage =
    profile?.role === "super_admin" ||
    profile?.role === "school_admin" ||
    profile?.role === "director" ||
    profile?.role === "preceptor" ||
    profile?.role === "secretary"

  const deleteCourseMutation = useMutation({
    mutationFn: (id: string) => courseService.delete(id),
    onSuccess: () => {
      toast.success("Curso eliminado correctamente")
      queryClient.invalidateQueries({ queryKey: ["courses", school?.id] })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar curso"
      )
    },
  })

  const deleteDivisionMutation = useMutation({
    mutationFn: (id: string) => courseService.deleteDivision(id),
    onSuccess: () => {
      toast.success("División eliminada correctamente")
      queryClient.invalidateQueries({ queryKey: ["courses", school?.id] })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar división"
      )
    },
  })

  const handleCreateCourse = () => {
    if (!newCourseName.trim()) return
    if (!school?.id) {
      toast.error("No se encontró la institución asociada")
      return
    }
    if (!activeAcademicYear?.id) {
      toast.error("No hay un año académico activo. Cree uno primero.")
      return
    }
    createCourse.mutate(
      {
        school_id: school.id,
        name: newCourseName.trim(),
        academic_year_id: activeAcademicYear.id,
      },
      {
        onSuccess: (course) => {
          if (newCourseDivisionName.trim()) {
            createDivision.mutate({
              school_id: school!.id,
              course_id: course.id,
              name: newCourseDivisionName.trim(),
              shift: newCourseDivisionShift || null,
              preceptor_id: newCourseDivisionPreceptor === " " ? null : (newCourseDivisionPreceptor || null),
              academic_year_id: activeAcademicYear!.id,
            })
          }
          setNewCourseName("")
          setNewCourseDivisionName("")
          setNewCourseDivisionShift("")
          setNewCourseDivisionPreceptor("")
          setCourseDialogOpen(false)
        },
      }
    )
  }

  const handleCreateDivision = () => {
    if (!newDivisionName.trim() || !courseForDivision) return
    if (!school?.id) {
      toast.error("No se encontró la institución asociada")
      return
    }
    if (!activeAcademicYear?.id) {
      toast.error("No hay un año académico activo. Cree uno primero.")
      return
    }
    createDivision.mutate(
      {
        school_id: school.id,
        course_id: courseForDivision,
        name: newDivisionName.trim(),
        shift: newDivisionShift || null,
        academic_year_id: activeAcademicYear.id,
      },
      {
        onSuccess: () => {
          setNewDivisionName("")
          setNewDivisionShift("")
          setDivisionDialogOpen(false)
        },
      }
    )
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.type === "course") {
      deleteCourseMutation.mutate(deleteTarget.id, {
        onSettled: () => setDeleteDialogOpen(false),
      })
    } else {
      deleteDivisionMutation.mutate(deleteTarget.id, {
        onSettled: () => setDeleteDialogOpen(false),
      })
    }
  }

  const handlePreceptorChange = (divisionId: string, preceptorId: string) => {
    updateDivision.mutate({
      id: divisionId,
      data: { preceptor_id: preceptorId === " " ? null : preceptorId },
    })
  }

  const openAttendanceDialog = (divisionId: string, divisionName: string, courseName: string) => {
    setAttendanceDialogDivision({ divisionId, divisionName, courseName })
    setAttendanceDialogOpen(true)
  }

  const openDivisionDialog = (courseId: string) => {
    setCourseForDivision(courseId)
    setDivisionDialogOpen(true)
  }

  if (authLoading) return <LoadingScreen />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cursos"
        description="Gestione los cursos y divisiones de la institución"
      >
        {canManage && (
          <Button onClick={() => setCourseDialogOpen(true)}>
            <Plus />
            Nuevo Curso
          </Button>
        )}
      </PageHeader>

      {coursesLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : !courses || courses.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="size-12" />}
          title="No hay cursos"
          description="Cree su primer curso para comenzar"
          action={
            canManage
              ? {
                  label: "Nuevo Curso",
                  onClick: () => setCourseDialogOpen(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              preceptors={preceptors ?? []}
              onAddDivision={() => openDivisionDialog(course.id)}
              onDeleteCourse={() => {
                setDeleteTarget({
                  type: "course",
                  id: course.id,
                  name: course.name,
                })
                setDeleteDialogOpen(true)
              }}
              onDeleteDivision={(divisionId, divisionName) => {
                setDeleteTarget({
                  type: "division",
                  id: divisionId,
                  name: divisionName,
                })
                setDeleteDialogOpen(true)
              }}
              onPreceptorChange={handlePreceptorChange}
              onAttendance={openAttendanceDialog}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Curso</DialogTitle>
            <DialogDescription>
              Complete los datos para crear un nuevo curso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del curso</label>
              <Input
                placeholder="Ej: 1° Año, 2° Año..."
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateCourse()
                }}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <label className="text-sm font-medium">División (opcional)</label>
              <Input
                placeholder="Ej: A, B, Única..."
                value={newCourseDivisionName}
                onChange={(e) => setNewCourseDivisionName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Turno (opcional)</label>
              <Select value={newCourseDivisionShift} onValueChange={(v) => setNewCourseDivisionShift(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mañana">Mañana</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                  <SelectItem value="vespertino">Vespertino</SelectItem>
                  <SelectItem value="nocturno">Nocturno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preceptor (opcional)</label>
              <Select value={newCourseDivisionPreceptor} onValueChange={(v) => setNewCourseDivisionPreceptor(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar preceptor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">Sin preceptor</SelectItem>
                  {preceptors?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.last_name}, {p.first_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCourseDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCourse}
              disabled={!newCourseName.trim() || createCourse.isPending}
            >
              {createCourse.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Curso"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={divisionDialogOpen} onOpenChange={setDivisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva División</DialogTitle>
            <DialogDescription>
              Complete los datos para crear una nueva división
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de la división</label>
              <Input
                placeholder="Ej: A, B, Única..."
                value={newDivisionName}
                onChange={(e) => setNewDivisionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateDivision()
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Turno</label>
              <Select value={newDivisionShift} onValueChange={(v) => setNewDivisionShift(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mañana">Mañana</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                  <SelectItem value="vespertino">Vespertino</SelectItem>
                  <SelectItem value="nocturno">Nocturno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDivisionDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateDivision}
              disabled={
                !newDivisionName.trim() || !courseForDivision || createDivision.isPending
              }
            >
              {createDivision.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear División"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AttendanceDialog
        open={attendanceDialogOpen}
        onOpenChange={setAttendanceDialogOpen}
        divisionId={attendanceDialogDivision?.divisionId ?? ""}
        divisionName={attendanceDialogDivision?.divisionName ?? ""}
        courseName={attendanceDialogDivision?.courseName ?? ""}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={`Eliminar ${deleteTarget?.type === "course" ? "curso" : "división"}`}
        description={`¿Está seguro de eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={
          deleteCourseMutation.isPending || deleteDivisionMutation.isPending
        }
        onConfirm={handleDelete}
      />
    </div>
  )
}

function CourseCard({
  course,
  preceptors,
  onAddDivision,
  onDeleteCourse,
  onDeleteDivision,
  onPreceptorChange,
  onAttendance,
  canManage,
}: {
  course: { id: string; name: string }
  preceptors: Profile[]
  onAddDivision: () => void
  onDeleteCourse: () => void
  onDeleteDivision: (id: string, name: string) => void
  onPreceptorChange: (divisionId: string, preceptorId: string) => void
  onAttendance: (divisionId: string, divisionName: string, courseName: string) => void
  canManage: boolean
}) {
  const { data: divisions, isLoading: divisionsLoading } = useDivisions(course.id)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-muted-foreground" />
            <CardTitle>{course.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {canManage && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onDeleteCourse}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {divisionsLoading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : !divisions || divisions.length === 0 ? (
          <div className="py-3 text-center">
            <Layers className="mx-auto size-6 text-muted-foreground/50" />
            <p className="mt-1 text-xs text-muted-foreground">
              Sin divisiones
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {divisions.map((div) => {
              const preceptor = preceptors.find((p) => p.id === div.preceptor_id)
              return (
                <div
                  key={div.id}
                  className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Layers className="size-3 shrink-0 text-muted-foreground" />
                    <span className="text-xs font-medium truncate">
                      {course.name} - {div.name}
                    </span>
                    {div.shift && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        <Clock className="mr-0.5 inline size-2.5" />
                        {div.shift}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {canManage && preceptors.length > 0 ? (
                      <Select
                        value={div.preceptor_id ?? ""}
                        onValueChange={(v) => onPreceptorChange(div.id, v)}
                      >
                        <SelectTrigger className="h-6 w-auto gap-1 text-[10px]">
                          <UserRound className="size-2.5" />
                          <SelectValue placeholder="Sin preceptor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=" ">Sin preceptor</SelectItem>
                          {preceptors.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.last_name}, {p.first_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : preceptor ? (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        <UserRound className="mr-0.5 inline size-2.5" />
                        {preceptor.last_name}, {preceptor.first_name}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50">
                        Sin preceptor
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onAttendance(div.id, div.name, course.name)}
                      title="Tomar asistencia"
                    >
                      <ClipboardCheck className="size-3" />
                    </Button>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onDeleteDivision(div.id, div.name)}
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {canManage && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={onAddDivision}
          >
            <Plus className="size-3.5" />
            Nueva División
          </Button>
        )}
      </CardContent>

    </Card>
  )
}

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
  status: AttendanceStatus | null
  observation: string | null
  attendanceId: string | null
}

function AttendanceDialog({
  open,
  onOpenChange,
  divisionId,
  divisionName,
  courseName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  divisionId: string
  divisionName: string
  courseName: string
}) {
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [searchQuery, setSearchQuery] = useState("")
  const [pendingStudents, setPendingStudents] = useState<Set<string>>(new Set())
  const [expandedObs, setExpandedObs] = useState<Set<string>>(new Set())

  const { data: students, isLoading: studentsLoading } = useStudents(
    open && !!divisionId ? divisionId : ""
  )
  const { data: attendanceRecords, isLoading: attendanceLoading } = useAttendance(
    open && !!divisionId ? divisionId : "",
    open && !!divisionId ? attendanceDate : ""
  )

  const markAttendance = useMarkAttendance()
  const markBulkAttendance = useMarkBulkAttendance()

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
      const a = attendanceMap.get(s.id)
      return {
        studentId: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        dni: s.dni,
        status: a?.status ?? null,
        observation: a?.observation ?? null,
        attendanceId: a?.id ?? null,
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

  const isLoading = studentsLoading || attendanceLoading
  const isSaving = markAttendance.isPending || markBulkAttendance.isPending
  const markedCount = studentsWithAttendance.filter((s) => s.status !== null).length

  const handleMarkStatus = (studentId: string, status: AttendanceStatus) => {
    setPendingStudents((prev) => new Set(prev).add(studentId))
    markAttendance.mutate(
      {
        student_id: studentId,
        division_id: divisionId,
        date: attendanceDate,
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
  }

  const handleMarkAllPresent = () => {
    if (!students || students.length === 0) return
    const studentIds = new Set(students.map((s) => s.id))
    setPendingStudents((prev) => new Set([...prev, ...studentIds]))
    markBulkAttendance.mutate(
      {
        divisionId,
        date: attendanceDate,
        records: students.map((s) => ({
          student_id: s.id,
          status: "present" as AttendanceStatus,
        })),
      },
      {
        onSettled: () => setPendingStudents(new Set()),
      }
    )
  }

  const toggleObservation = (studentId: string) => {
    setExpandedObs((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const handleObservationChange = (studentId: string, observation: string) => {
    const record = attendanceMap.get(studentId)
    if (!record) return
    setPendingStudents((prev) => new Set(prev).add(studentId))
    markAttendance.mutate(
      {
        student_id: studentId,
        division_id: divisionId,
        date: attendanceDate,
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
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {courseName} - {divisionName}
          </DialogTitle>
          <DialogDescription>
            Tomar asistencia
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 pb-2">
          <Input
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="h-8 w-[150px] text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleMarkAllPresent}
            disabled={!students || students.length === 0 || isSaving}
          >
            <Check className="size-3.5" />
            Marcar todos Presente
          </Button>
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar alumno..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-7 text-xs"
            />
          </div>
          {students && students.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {markedCount}/{studentsWithAttendance.length}
            </Badge>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : !students || students.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                Sin alumnos asignados a esta división
              </p>
            </div>
          ) : (
            filteredStudents.map((student) => {
              const isPending = pendingStudents.has(student.studentId)
              const showObs = expandedObs.has(student.studentId)
              return (
                <div
                  key={student.studentId}
                  className={cn(
                    "rounded-lg border p-3 transition-opacity",
                    isPending && "opacity-60 pointer-events-none"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">
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

                  <div className="flex flex-wrap gap-1.5 mt-2">
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
                            <span className="hidden sm:inline">{config.label}</span>
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
                    <div className="pt-2">
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
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
