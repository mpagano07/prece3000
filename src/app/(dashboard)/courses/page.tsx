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
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useCourses, useDivisions, useCreateCourse, useCreateDivision } from "@/hooks/use-courses"
import { courseService } from "@/services/courses"
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

export default function CoursesPage() {
  const { school, profile, isLoading: authLoading } = useAuth()
  const queryClient = useQueryClient()

  const { data: courses, isLoading: coursesLoading } = useCourses()
  const createCourse = useCreateCourse()
  const createDivision = useCreateDivision()

  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())
  const [courseDialogOpen, setCourseDialogOpen] = useState(false)
  const [divisionDialogOpen, setDivisionDialogOpen] = useState(false)
  const [courseForDivision, setCourseForDivision] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "course" | "division"
    id: string
    name: string
  } | null>(null)

  const [newCourseName, setNewCourseName] = useState("")
  const [newDivisionName, setNewDivisionName] = useState("")
  const [newDivisionShift, setNewDivisionShift] = useState("")

  const isAdmin = profile?.role === "school_admin"

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

  const handleCreateCourse = () => {
    if (!newCourseName.trim()) return
    createCourse.mutate(
      {
        school_id: school?.id ?? "",
        name: newCourseName.trim(),
        academic_year_id: "",
      },
      {
        onSuccess: () => {
          setNewCourseName("")
          setCourseDialogOpen(false)
        },
      }
    )
  }

  const handleCreateDivision = () => {
    if (!newDivisionName.trim() || !courseForDivision) return
    createDivision.mutate(
      {
        school_id: school?.id ?? "",
        course_id: courseForDivision,
        name: newDivisionName.trim(),
        shift: newDivisionShift || null,
        academic_year_id: "",
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
        {isAdmin && (
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
            isAdmin
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
              isExpanded={expandedCourses.has(course.id)}
              onToggleExpand={() => toggleExpand(course.id)}
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
              isAdmin={isAdmin}
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
  isExpanded,
  onToggleExpand,
  onAddDivision,
  onDeleteCourse,
  onDeleteDivision,
  isAdmin,
}: {
  course: { id: string; name: string }
  isExpanded: boolean
  onToggleExpand: () => void
  onAddDivision: () => void
  onDeleteCourse: () => void
  onDeleteDivision: (id: string, name: string) => void
  isAdmin: boolean
}) {
  const { data: divisions, isLoading: divisionsLoading } = useDivisions(
    isExpanded ? course.id : ""
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-muted-foreground" />
            <CardTitle>{course.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
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

      {isExpanded && (
        <CardContent>
          <Separator className="mb-3" />

          {divisionsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : !divisions || divisions.length === 0 ? (
            <div className="py-4 text-center">
              <Layers className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-2 text-xs text-muted-foreground">
                Sin divisiones
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {divisions.map((div) => (
                <div
                  key={div.id}
                  className="flex items-center justify-between rounded-lg border p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="size-3.5 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">{div.name}</span>
                      {div.shift && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          <Clock className="mr-0.5 inline size-3" />
                          {div.shift}
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onDeleteDivision(div.id, div.name)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isAdmin && (
            <>
              <Separator className="my-3" />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onAddDivision}
              >
                <Plus className="size-3.5" />
                Nueva División
              </Button>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
