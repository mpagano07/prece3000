import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { TeacherService } from "@/services/teachers"
import { useAuth } from "@/contexts/auth-context"

export function usePreceptors() {
  const { school } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ["preceptors", school?.id],
    queryFn: () => TeacherService.getPreceptorsBySchool(supabase, school!.id),
    enabled: !!school?.id,
  })
}
