import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getAllEvents, createEvent } from "@/services/calendar"
import { useAuth } from "@/contexts/auth-context"
import type { CalendarEvent } from "@/types/database"

export function useCalendarEvents(startDate: string, endDate: string) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["calendar", school?.id, startDate, endDate],
    queryFn: () => getAllEvents(school!.id, startDate, endDate),
    enabled: !!school?.id && !!startDate && !!endDate,
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  const { school, profile } = useAuth()

  return useMutation({
    mutationFn: (
      data: Omit<CalendarEvent, "id" | "createdAt" | "createdBy">
    ) => createEvent(school!.id, {
      title: data.title,
      description: data.description ?? undefined,
      start_date: String(data.startDate),
      end_date: data.endDate ? String(data.endDate) : undefined,
      type: data.type,
      all_day: data.allDay ?? undefined,
    }, profile!.id),
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
