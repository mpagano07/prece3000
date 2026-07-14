import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getAllBookEntries, createBookEntry, getStudentBookEntries } from "@/services/book"
import { useAuth } from "@/contexts/auth-context"
import type { PreceptorBookEntry, BookEntryType } from "@/types/database"

export function useBookEntries(
  filters?: {
    type?: BookEntryType
    studentId?: string
    startDate?: string
    endDate?: string
  }
) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["book", school?.id, filters],
    queryFn: () => getAllBookEntries(school!.id, filters),
    enabled: !!school?.id,
  })
}

export function useCreateBookEntry() {
  const queryClient = useQueryClient()
  const { school, profile } = useAuth()

  return useMutation({
    mutationFn: (
      data: Omit<
        PreceptorBookEntry,
        "id" | "createdAt" | "createdBy"
      >
    ) => createBookEntry(school!.id, { type: data.type, title: data.title, description: data.description, studentId: data.studentId ?? undefined }, profile!.id),
    onSuccess: () => {
      toast.success("Registro creado correctamente")
      queryClient.invalidateQueries({ queryKey: ["book", school?.id] })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al crear registro"
      )
    },
  })
}

export function useStudentBookEntries(studentId: string) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["book", school?.id, "student", studentId],
    queryFn: () => getStudentBookEntries(studentId),
    enabled: !!school?.id && !!studentId,
  })
}
