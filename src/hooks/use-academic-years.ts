import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { SchoolService } from "@/services/schools"
import { useAuth } from "@/contexts/auth-context"

export function useActiveAcademicYear() {
  const { school } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ["activeAcademicYear", school?.id],
    queryFn: () => SchoolService.getActiveAcademicYear(supabase, school!.id),
    enabled: !!school?.id,
  })
}
