import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { attendanceService } from "@/services/attendance"
import { useAuth } from "@/contexts/auth-context"
import type { Attendance, AttendanceStatus } from "@/types/database"

export function useAttendance(divisionId: string, date: string) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["attendance", school?.id, divisionId, date],
    queryFn: () => attendanceService.getByDivisionAndDate(divisionId, date),
    enabled: !!school?.id && !!divisionId && !!date,
  })
}

export function useMarkAttendance() {
  const queryClient = useQueryClient()
  const { school } = useAuth()

  return useMutation({
    mutationFn: (data: {
      student_id: string
      division_id: string
      date: string
      status: AttendanceStatus
      observation?: string
    }) => attendanceService.mark(data),
    onSuccess: (_, variables) => {
      toast.success("Asistencia registrada correctamente")
      queryClient.invalidateQueries({
        queryKey: ["attendance", school?.id, variables.division_id],
      })
      queryClient.invalidateQueries({
        queryKey: ["dashboard", school?.id, "stats"],
      })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al registrar asistencia"
      )
    },
  })
}

export function useMarkBulkAttendance() {
  const queryClient = useQueryClient()
  const { school } = useAuth()

  return useMutation({
    mutationFn: async (data: {
      divisionId: string
      date: string
      records: Array<{
        student_id: string
        status: AttendanceStatus
        observation?: string
      }>
    }) => {
      const res = await fetch("/api/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: school?.id,
          divisionId: data.divisionId,
          date: data.date,
          records: data.records,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Error al registrar asistencia masiva")
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      toast.success("Asistencia registrada correctamente")
      queryClient.invalidateQueries({
        queryKey: ["attendance", school?.id, variables.divisionId],
      })
      queryClient.invalidateQueries({
        queryKey: ["dashboard", school?.id, "stats"],
      })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al registrar asistencia masiva"
      )
    },
  })
}

export function useAttendanceReport(
  divisionId: string,
  year: number,
  month: number
) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["attendance", school?.id, divisionId, "report", year, month],
    queryFn: () => attendanceService.getReport(divisionId, year, month),
    enabled: !!school?.id && !!divisionId,
  })
}
