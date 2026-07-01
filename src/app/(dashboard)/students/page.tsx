"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useStudents, useStudentSearch } from "@/hooks/use-students"
import { useCourses } from "@/hooks/use-courses"
import { courseService } from "@/services/courses"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
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
  Search,
  Plus,
  Upload,
  Users,
  ChevronRight,
} from "lucide-react"
import { getInitials } from "@/lib/utils"
import type { DivisionWithCourse } from "@/types/database"

const statusBadge: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  inactive: "secondary",
  graduated: "outline",
}

const statusLabel: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  graduated: "Graduado",
}

export default function StudentsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [divisionId, setDivisionId] = useState("")
  const [courseId, setCourseId] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data: courses, isLoading: coursesLoading } = useCourses()
  const courseIds = useMemo(() => (courses ?? []).map((c) => c.id), [courses])
  const { data: allDivisions } = useQuery({
    queryKey: ["all-divisions", ...courseIds],
    queryFn: async () => {
      const results = await Promise.all(
        courseIds.map((id) => courseService.getDivisions(id))
      )
      return results.flat()
    },
    enabled: courseIds.length > 0,
  })

  const { data: students, isLoading: studentsLoading } = useStudents(
    divisionId || undefined
  )
  const { data: searchResults, isLoading: searchLoading } = useStudentSearch(
    debouncedSearch
  )

  const displayStudents = useMemo(() => {
    if (debouncedSearch) return searchResults ?? []
    return students ?? []
  }, [debouncedSearch, searchResults, students])

  const divisionLookup = useMemo(() => {
    const map = new Map<string, DivisionWithCourse>()
    ;(allDivisions ?? []).forEach((d) => map.set(d.id, d))
    return map
  }, [allDivisions])

  const filteredStudents = useMemo(() => {
    let list = displayStudents
    if (courseId) {
      const divIds = new Set(
        (allDivisions ?? [])
          .filter((d) => d.course_id === courseId)
          .map((d) => d.id)
      )
      list = list.filter((s) => s.division_id && divIds.has(s.division_id))
    }
    if (divisionId) {
      list = list.filter((s) => s.division_id === divisionId)
    }
    return list
  }, [displayStudents, courseId, divisionId, allDivisions])

  const isLoading = studentsLoading || searchLoading || coursesLoading

  if (isLoading) return <LoadingScreen />

  return (
    <div className="space-y-6">
      <PageHeader title="Alumnos" description="Gestión de alumnos">
        <Button onClick={() => router.push("/students/import")} variant="outline">
          <Upload className="size-4" />
          Importar
        </Button>
        <Button onClick={() => router.push("/students/new")}>
          <Plus className="size-4" />
          Nuevo Alumno
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nombre, apellido o DNI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Select value={courseId} onValueChange={(v) => { setCourseId(v ?? ""); setDivisionId("") }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filtrar por curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los cursos</SelectItem>
              {(courses ?? []).map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={divisionId} onValueChange={(v) => setDivisionId(v ?? "")}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filtrar por división" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las divisiones</SelectItem>
              {(allDivisions ?? []).map((division) => (
                <SelectItem key={division.id} value={division.id}>
                  {division.course?.name} - {division.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <EmptyState
          icon={<Users className="size-12" />}
          title={
            debouncedSearch
              ? "Sin resultados de búsqueda"
              : "No hay alumnos registrados"
          }
          description={
            debouncedSearch
              ? `No se encontraron alumnos para "${debouncedSearch}"`
              : "Comienza agregando un nuevo alumno"
          }
          action={
            !debouncedSearch
              ? {
                  label: "Nuevo Alumno",
                  onClick: () => router.push("/students/new"),
                }
              : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Foto</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>División</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => {
                const div = student.division_id
                  ? divisionLookup.get(student.division_id)
                  : undefined
                return (
                  <TableRow
                    key={student.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/students/${student.id}`)}
                  >
                    <TableCell>
                      <Avatar size="sm">
                        {student.photo_url && (
                          <AvatarImage src={student.photo_url} />
                        )}
                        <AvatarFallback>
                          {getInitials(student.first_name, student.last_name)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.last_name}, {student.first_name}
                    </TableCell>
                    <TableCell>{student.dni}</TableCell>
                    <TableCell>{div?.name ?? "-"}</TableCell>
                    <TableCell>{div?.course?.name ?? "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={statusBadge[student.status] ?? "outline"}
                      >
                        {statusLabel[student.status] ?? student.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
