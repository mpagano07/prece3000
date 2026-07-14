import { useQuery } from "@tanstack/react-query"
import { getDashboardStats, getBirthdays, getAlerts, getUpcomingEvents, getNearFailing } from "@/services/dashboard"
import { useAuth } from "@/contexts/auth-context"

export function useDashboardStats(divisionId?: string) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["dashboard", school?.id, "stats", divisionId],
    queryFn: () => getDashboardStats(school!.id, divisionId),
    enabled: !!school?.id,
  })
}

export function useDashboardBirthdays() {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["dashboard", school?.id, "birthdays"],
    queryFn: () => getBirthdays(school!.id),
    enabled: !!school?.id,
  })
}

export function useDashboardAlerts() {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["dashboard", school?.id, "alerts"],
    queryFn: () => getAlerts(school!.id),
    enabled: !!school?.id,
  })
}

export function useUpcomingEvents() {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["dashboard", school?.id, "upcoming-events"],
    queryFn: () => getUpcomingEvents(school!.id),
    enabled: !!school?.id,
  })
}

export function useNearFailingStudents() {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["dashboard", school?.id, "near-failing"],
    queryFn: () => getNearFailing(school!.id),
    enabled: !!school?.id,
  })
}
