import { useQuery } from "@tanstack/react-query"
import { getPreceptorsBySchool } from "@/services/teachers"
import { useAuth } from "@/contexts/auth-context"

export function usePreceptors() {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["preceptors", school?.id],
    queryFn: () => getPreceptorsBySchool(school!.id),
    enabled: !!school?.id,
  })
}
