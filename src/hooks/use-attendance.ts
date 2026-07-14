import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getByDivisionAndDate, markAttendance, getMonthlyReport } from "@/services/attendance"
import { useAuth } from "@/contexts/auth-context"
import type { Attendance, AttendanceStatus } from "@/types/database"

export function useAttendance(divisionId: string, date: string) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["attendance", school?.id, divisionId, date],
    queryFn: () => getByDivisionAndDate(divisionId, date, school!.id),
    enabled: !!school?.id && !!divisionId && !!date,
  })
}

export function useMarkAttendance() {
  const queryClient = useQueryClient()
  const { school, profile } = useAuth()

  return useMutation({
    mutationFn: (data: {
      studentId: string
      divisionId: string
      date: string
      status: AttendanceStatus
      observation?: string
    }) => markAttendance(school!.id, data.studentId, data.divisionId, data.date, data.status, profile!.id, data.observation),
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
        studentId: string
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
    queryFn: () => getMonthlyReport(school!.id, divisionId, year, month),
    enabled: !!school?.id && !!divisionId,
  })
}
