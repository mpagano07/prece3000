import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { communicationService } from "@/services/communications"
import { useAuth } from "@/contexts/auth-context"
import type { Communication } from "@/types/database"

export function useStudentCommunications(studentId: string) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["communications", school?.id, studentId],
    queryFn: () => communicationService.getStudentCommunications(studentId),
    enabled: !!school?.id && !!studentId,
  })
}

export function useCreateCommunication() {
  const queryClient = useQueryClient()
  const { school } = useAuth()

  return useMutation({
    mutationFn: (
      data: Omit<Communication, "id" | "sent_at">
    ) => communicationService.create(data),
    onSuccess: (_, variables) => {
      toast.success("Comunicación registrada correctamente")
      queryClient.invalidateQueries({
        queryKey: ["communications", school?.id, variables.student_id],
      })
      queryClient.invalidateQueries({ queryKey: ["communications", school?.id] })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al crear comunicación"
      )
    },
  })
}
