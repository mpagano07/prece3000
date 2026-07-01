import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { preceptorBookService } from "@/services/book"
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
    queryFn: () => preceptorBookService.getEntries(filters),
    enabled: !!school?.id,
  })
}

export function useCreateBookEntry() {
  const queryClient = useQueryClient()
  const { school } = useAuth()

  return useMutation({
    mutationFn: (
      data: Omit<
        PreceptorBookEntry,
        "id" | "created_at" | "created_by"
      >
    ) => preceptorBookService.createEntry(data),
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
    queryFn: () => preceptorBookService.getStudentEntries(studentId),
    enabled: !!school?.id && !!studentId,
  })
}
