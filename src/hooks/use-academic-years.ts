import { useQuery } from "@tanstack/react-query"
import { getActiveAcademicYear } from "@/services/schools"
import { useAuth } from "@/contexts/auth-context"

export function useActiveAcademicYear() {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["activeAcademicYear", school?.id],
    queryFn: () => getActiveAcademicYear(school!.id),
    enabled: !!school?.id,
  })
}
