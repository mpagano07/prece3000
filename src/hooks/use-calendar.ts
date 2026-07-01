import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { calendarService } from "@/services/calendar"
import { useAuth } from "@/contexts/auth-context"
import type { CalendarEvent } from "@/types/database"

export function useCalendarEvents(startDate: string, endDate: string) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["calendar", school?.id, startDate, endDate],
    queryFn: () => calendarService.getEvents(startDate, endDate),
    enabled: !!school?.id && !!startDate && !!endDate,
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  const { school } = useAuth()

  return useMutation({
    mutationFn: (
      data: Omit<CalendarEvent, "id" | "created_at" | "created_by">
    ) => calendarService.createEvent(data),
    onSuccess: () => {
      toast.success("Evento creado correctamente")
      queryClient.invalidateQueries({ queryKey: ["calendar", school?.id] })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al crear evento"
      )
    },
  })
}
