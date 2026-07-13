import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { studentService } from "@/services/students"
import { useAuth } from "@/contexts/auth-context"
import type { Student } from "@/types/database"

export function useStudents(divisionId?: string) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["students", school?.id, divisionId],
    queryFn: () => studentService.getAll(divisionId),
    enabled: !!school?.id,
  })
}

export function useStudentsPaginated(
  page: number,
  pageSize: number,
  filters?: { divisionId?: string; divisionIds?: string[] }
) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["students", school?.id, "page", page, pageSize, filters],
    queryFn: () => studentService.getPage(page, pageSize, filters),
    enabled: !!school?.id,
  })
}

export function useStudent(id: string) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["students", school?.id, id],
    queryFn: () => studentService.getById(id),
    enabled: !!school?.id && !!id,
  })
}

export function useCreateStudent() {
  const queryClient = useQueryClient()
  const { school } = useAuth()

  return useMutation({
    mutationFn: (data: Omit<Student, "id" | "created_at" | "updated_at">) =>
      studentService.create(data),
    onSuccess: () => {
      toast.success("Estudiante creado correctamente")
      queryClient.invalidateQueries({ queryKey: ["students", school?.id] })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al crear estudiante"
      )
    },
  })
}

export function useUpdateStudent() {
  const queryClient = useQueryClient()
  const { school } = useAuth()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Student> }) =>
      studentService.update(id, data),
    onSuccess: () => {
      toast.success("Estudiante actualizado correctamente")
      queryClient.invalidateQueries({ queryKey: ["students", school?.id] })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar estudiante"
      )
    },
  })
}

export function useStudentHistory(studentId: string) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["students", school?.id, studentId, "history"],
    queryFn: () => studentService.getHistory(studentId),
    enabled: !!school?.id && !!studentId,
  })
}

export function useStudentSearch(query: string) {
  const { school } = useAuth()
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  return useQuery({
    queryKey: ["students", school?.id, "search", debouncedQuery],
    queryFn: () => studentService.search(debouncedQuery),
    enabled: !!school?.id && debouncedQuery.length > 0,
  })
}
