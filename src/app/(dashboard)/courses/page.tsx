"use client"

import { useState } from "react"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Plus,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Layers,
  Trash2,
  Loader2,
  GraduationCap,
  Clock,
  Search,
  UserCheck,
  UserX,
  UserRound,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useCourses, useDivisions, useCreateCourse, useCreateDivision, useUpdateDivision } from "@/hooks/use-courses"
import { courseService } from "@/services/courses"
import { useActiveAcademicYear } from "@/hooks/use-academic-years"
import { usePreceptors } from "@/hooks/use-preceptors"
import { useStudents, useStudentSearch, useUpdateStudent } from "@/hooks/use-students"
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
  CardDescription,
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
  const updateStudent = useUpdateStudent()

  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())
  const [expandedDivisionStudents, setExpandedDivisionStudents] = useState<Set<string>>(new Set())
  const [courseDialogOpen, setCourseDialogOpen] = useState(false)
  const [divisionDialogOpen, setDivisionDialogOpen] = useState(false)
  const [courseForDivision, setCourseForDivision] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "course" | "division"
    id: string
    name: string
  } | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignDivisionId, setAssignDivisionId] = useState("")
  const [assignSearch, setAssignSearch] = useState("")

  const [newCourseName, setNewCourseName] = useState("")
  const [newCourseDivisionName, setNewCourseDivisionName] = useState("")
  const [newCourseDivisionShift, setNewCourseDivisionShift] = useState("")
  const [newCourseDivisionPreceptor, setNewCourseDivisionPreceptor] = useState("")
  const [newDivisionName, setNewDivisionName] = useState("")
  const [newDivisionShift, setNewDivisionShift] = useState("")

  const canManage =
    profile?.role === "super_admin" ||
    profile?.role === "school_admin" ||
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

  const toggleExpand = (courseId: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  const toggleExpandedDivisionStudents = (divisionId: string) => {
    setExpandedDivisionStudents((prev) => {
      const next = new Set(prev)
      if (next.has(divisionId)) next.delete(divisionId)
      else next.add(divisionId)
      return next
    })
  }

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

  const handleRemoveStudent = (studentId: string, studentName: string) => {
    updateStudent.mutate(
      { id: studentId, data: { division_id: null } },
      {
        onSuccess: () => {
          toast.success(`${studentName} removido de la división`)
          queryClient.invalidateQueries({ queryKey: ["students"] })
        },
      }
    )
  }

  const handleAssignStudent = (studentId: string) => {
    if (!assignDivisionId) return
    updateStudent.mutate(
      { id: studentId, data: { division_id: assignDivisionId } },
      {
        onSuccess: () => {
          toast.success("Estudiante asignado a la división")
          queryClient.invalidateQueries({ queryKey: ["students"] })
        },
      }
    )
  }

  const openAssignDialog = (divisionId: string) => {
    setAssignDivisionId(divisionId)
    setAssignSearch("")
    setAssignDialogOpen(true)
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
              isExpanded={expandedCourses.has(course.id)}
              expandedDivisionStudents={expandedDivisionStudents}
              onToggleExpand={() => toggleExpand(course.id)}
              onToggleExpandedDivisionStudents={toggleExpandedDivisionStudents}
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
              onRemoveStudent={handleRemoveStudent}
              onAssignStudent={openAssignDialog}
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

      <AssignStudentsDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        divisionId={assignDivisionId}
        search={assignSearch}
        onSearchChange={setAssignSearch}
        onAssign={handleAssignStudent}
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
  isExpanded,
  expandedDivisionStudents,
  onToggleExpand,
  onToggleExpandedDivisionStudents,
  onAddDivision,
  onDeleteCourse,
  onDeleteDivision,
  onPreceptorChange,
  onRemoveStudent,
  onAssignStudent,
  canManage,
}: {
  course: { id: string; name: string }
  preceptors: Profile[]
  isExpanded: boolean
  expandedDivisionStudents: Set<string>
  onToggleExpand: () => void
  onToggleExpandedDivisionStudents: (divisionId: string) => void
  onAddDivision: () => void
  onDeleteCourse: () => void
  onDeleteDivision: (id: string, name: string) => void
  onPreceptorChange: (divisionId: string, preceptorId: string) => void
  onRemoveStudent: (studentId: string, studentName: string) => void
  onAssignStudent: (divisionId: string) => void
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
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleExpand}
            >
              {isExpanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className={isExpanded ? "pb-3" : ""}>
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

      {isExpanded && (
        <CardContent className="border-t pt-3">
          {!divisions || divisions.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              Cree una división para gestionar alumnos
            </p>
          ) : (
            <div className="space-y-3">
              {divisions.map((div) => (
                <DivisionItem
                  key={div.id}
                  division={div}
                  preceptors={preceptors}
                  isStudentsExpanded={expandedDivisionStudents.has(div.id)}
                  onToggleStudents={() => onToggleExpandedDivisionStudents(div.id)}
                  onPreceptorChange={(preceptorId) => onPreceptorChange(div.id, preceptorId)}
                  onRemoveStudent={(studentId, studentName) => onRemoveStudent(studentId, studentName)}
                  onAssignStudent={() => onAssignStudent(div.id)}
                  onDelete={() => onDeleteDivision(div.id, div.name)}
                  canManage={canManage}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function DivisionItem({
  division,
  preceptors,
  isStudentsExpanded,
  onToggleStudents,
  onPreceptorChange,
  onRemoveStudent,
  onAssignStudent,
  onDelete,
  canManage,
}: {
  division: { id: string; name: string; shift: string | null; preceptor_id: string | null }
  preceptors: Profile[]
  isStudentsExpanded: boolean
  onToggleStudents: () => void
  onPreceptorChange: (preceptorId: string) => void
  onRemoveStudent: (studentId: string, studentName: string) => void
  onAssignStudent: () => void
  onDelete: () => void
  canManage: boolean
}) {
  const { data: students, isLoading: studentsLoading } = useStudents(
    isStudentsExpanded ? division.id : ""
  )

  const assignedPreceptor = preceptors.find((p) => p.id === division.preceptor_id)
  const studentCount = students?.length ?? 0

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between gap-2 p-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{division.name}</span>
          {division.shift && (
            <span className="shrink-0 text-xs text-muted-foreground">
              <Clock className="mr-0.5 inline size-3" />
              {division.shift}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canManage && preceptors.length > 0 && (
            <Select
              value={division.preceptor_id ?? ""}
              onValueChange={(v) => onPreceptorChange(v)}
            >
              <SelectTrigger className="h-7 w-auto gap-1 text-xs">
                <UserRound className="size-3" />
                <SelectValue placeholder="Preceptor" />
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
          )}

          {!canManage && assignedPreceptor && (
            <Badge variant="outline" className="gap-1 text-xs">
              <UserRound className="size-3" />
              {assignedPreceptor.last_name}, {assignedPreceptor.first_name}
            </Badge>
          )}

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onToggleStudents}
            title="Ver alumnos"
          >
            {studentsLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <span className="flex items-center gap-1 text-xs font-medium">
                <GraduationCap className="size-3.5" />
                {studentCount}
              </span>
            )}
          </Button>

          {canManage && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {isStudentsExpanded && (
        <div className="border-t px-2.5 py-2 space-y-1.5">
          {studentsLoading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : !students || students.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Sin alumnos asignados
            </p>
          ) : (
            students.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <UserCheck className="size-3 shrink-0 text-muted-foreground" />
                  <span className="text-xs truncate">
                    {student.last_name}, {student.first_name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    DNI: {student.dni}
                  </span>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onRemoveStudent(student.id, `${student.last_name}, ${student.first_name}`)}
                    title="Remover de la división"
                  >
                    <UserX className="size-3 text-destructive" />
                  </Button>
                )}
              </div>
            ))
          )}

          {canManage && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-1"
              onClick={onAssignStudent}
            >
              <Plus className="size-3.5" />
              Asignar Alumno
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function AssignStudentsDialog({
  open,
  onOpenChange,
  divisionId,
  search,
  onSearchChange,
  onAssign,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  divisionId: string
  search: string
  onSearchChange: (search: string) => void
  onAssign: (studentId: string) => void
}) {
  const { data: searchResults, isLoading: searchLoading } = useStudentSearch(search)

  const availableStudents = searchResults?.filter(
    (s) => !s.division_id || s.division_id !== divisionId
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar Alumno</DialogTitle>
          <DialogDescription>
            Busque un alumno para asignarlo a esta división
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nombre o DNI..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {searchLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : !search.trim() ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Escriba para buscar alumnos
              </p>
            ) : !availableStudents || availableStudents.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No se encontraron alumnos
              </p>
            ) : (
              availableStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm truncate">
                      {student.last_name}, {student.first_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      DNI: {student.dni}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      onAssign(student.id)
                      onOpenChange(false)
                    }}
                  >
                    Asignar
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
