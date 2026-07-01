import { useQuery } from "@tanstack/react-query"
import { dashboardService } from "@/services/dashboard"
import { useAuth } from "@/contexts/auth-context"

export function useDashboardStats(divisionId?: string) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["dashboard", school?.id, "stats", divisionId],
    queryFn: () => dashboardService.getStats(divisionId),
    enabled: !!school?.id,
  })
}

export function useDashboardBirthdays() {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["dashboard", school?.id, "birthdays"],
    queryFn: () => dashboardService.getBirthdays(),
    enabled: !!school?.id,
  })
}

export function useDashboardAlerts() {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["dashboard", school?.id, "alerts"],
    queryFn: () => dashboardService.getAlerts(),
    enabled: !!school?.id,
  })
}

export function useUpcomingEvents() {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["dashboard", school?.id, "upcoming-events"],
    queryFn: () => dashboardService.getUpcomingEvents(),
    enabled: !!school?.id,
  })
}

export function useNearFailingStudents() {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["dashboard", school?.id, "near-failing"],
    queryFn: () => dashboardService.getNearFailingStudents(),
    enabled: !!school?.id,
  })
}
