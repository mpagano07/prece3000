import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { courseService } from "@/services/courses"
import { useAuth } from "@/contexts/auth-context"
import type { Course, Division } from "@/types/database"

export function useCourses(academicYearId?: string) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["courses", school?.id, academicYearId],
    queryFn: () => courseService.getAll(academicYearId),
    enabled: !!school?.id,
  })
}

export function useDivisions(courseId: string) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["courses", school?.id, courseId, "divisions"],
    queryFn: () => courseService.getDivisions(courseId),
    enabled: !!school?.id && !!courseId,
  })
}

export function useCreateCourse() {
  const queryClient = useQueryClient()
  const { school } = useAuth()

  return useMutation({
    mutationFn: (data: Omit<Course, "id">) => courseService.create(data),
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

export function useCreateDivision() {
  const queryClient = useQueryClient()
  const { school } = useAuth()

  return useMutation({
    mutationFn: (data: Omit<Division, "id">) =>
      courseService.createDivision(data),
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
