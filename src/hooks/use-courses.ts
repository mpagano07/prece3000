import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getCoursesBySchool, getDivisions as getDivisionsByCourse, createCourse, updateDivision, createDivision } from "@/services/courses"
import { useAuth } from "@/contexts/auth-context"
import type { Course, Division } from "@/types/database"

export function useCourses(academicYearId?: string) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["courses", school?.id, academicYearId],
    queryFn: () => getCoursesBySchool(school!.id, academicYearId),
    enabled: !!school?.id,
  })
}

export function useDivisions(courseId: string) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["courses", school?.id, courseId, "divisions"],
    queryFn: () => getDivisionsByCourse(courseId),
    enabled: !!school?.id && !!courseId,
  })
}

export function useCreateCourse() {
  const queryClient = useQueryClient()
  const { school } = useAuth()

  return useMutation({
    mutationFn: (data: Omit<Course, "id">) => createCourse({ schoolId: data.schoolId, name: data.name, academicYearId: data.academicYearId }),
    onSuccess: () => {
      toast.success("Curso creado correctamente")
      queryClient.invalidateQueries({ queryKey: ["courses", school?.id] })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al crear curso"
      )
    },
  })
}

export function useUpdateDivision() {
  const queryClient = useQueryClient()
  const { school } = useAuth()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Partial<Pick<Division, "name" | "shift" | "preceptorId">>
    }) => updateDivision(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses", school?.id] })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar división"
      )
    },
  })
}

export function useCreateDivision() {
  const queryClient = useQueryClient()
  const { school } = useAuth()

  return useMutation({
    mutationFn: (data: Parameters<typeof createDivision>[0]) =>
      createDivision(data),
    onSuccess: () => {
      toast.success("División creada correctamente")
      queryClient.invalidateQueries({ queryKey: ["courses", school?.id] })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al crear división"
      )
    },
  })
}
