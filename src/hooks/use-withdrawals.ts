import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getWithdrawalsByStudent, createWithdrawal } from "@/services/withdrawals"
import { useAuth } from "@/contexts/auth-context"
import type { Withdrawal } from "@/types/database"

export function useStudentWithdrawals(studentId: string) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["withdrawals", school?.id, studentId],
    queryFn: () => getWithdrawalsByStudent(studentId),
    enabled: !!school?.id && !!studentId,
  })
}

export function useCreateWithdrawal() {
  const queryClient = useQueryClient()
  const { school } = useAuth()

  return useMutation({
    mutationFn: (
      data: Omit<Withdrawal, "id" | "createdAt">
    ) => createWithdrawal(data.schoolId, {
      studentId: data.studentId,
      withdrawnBy: data.withdrawnBy,
      document: data.document ?? undefined,
      observations: data.observations ?? undefined,
      signature: data.signature ?? undefined,
      date: data.date,
      time: data.time,
    }),
    onSuccess: (_, variables) => {
      toast.success("Retiro registrado correctamente")
      queryClient.invalidateQueries({
        queryKey: ["withdrawals", school?.id, variables.studentId],
      })
      queryClient.invalidateQueries({ queryKey: ["withdrawals", school?.id] })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al registrar retiro"
      )
    },
  })
}
