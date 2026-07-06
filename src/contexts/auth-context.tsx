"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import type { Profile, School } from "@/types/database"
import { useRouter } from "next/navigation"
import { setActiveSchoolId } from "@/lib/active-school"

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  school: School | null
  availableSchools: School[]
  setActiveSchool: (school: School | null) => void
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [availableSchools, setAvailableSchools] = useState<School[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()

    if (!error && profileData) {
      setProfile(profileData)
      setAvailableSchools([])

      if (profileData.role === "super_admin") {
        const { data: schoolsData } = await supabase
          .from("schools")
          .select("*")
          .eq("active", true)
          .order("name")
        const schools = schoolsData ?? []
        setAvailableSchools(schools)

        const storedId = localStorage.getItem("activeSchoolId")
        const target = storedId
          ? schools.find((s) => s.id === storedId)
          : schools[0]
        setSchool(target ?? null)
        setActiveSchoolId(target?.id ?? null)
      } else if (profileData.role === "preceptor") {
        const schoolIds: string[] = []
        if (profileData.school_id) schoolIds.push(profileData.school_id)

        const { data: extraSchools } = await supabase
          .from("preceptor_schools")
          .select("school_id")
          .eq("preceptor_id", userId)

        if (extraSchools) {
          for (const es of extraSchools) {
            if (!schoolIds.includes(es.school_id)) {
              schoolIds.push(es.school_id)
            }
          }
        }

        if (schoolIds.length > 0) {
          const { data: schoolsData } = await supabase
            .from("schools")
            .select("*")
            .in("id", schoolIds)

          const schools = schoolsData ?? []
          setAvailableSchools(schools)

          const storedId = localStorage.getItem("activeSchoolId")
          const target = storedId
            ? schools.find((s) => s.id === storedId)
            : schools[0]
          setSchool(target ?? null)
          setActiveSchoolId(target?.id ?? null)
        } else {
          setSchool(null)
          setActiveSchoolId(null)
        }
      } else if (profileData.role === "teacher") {
        const schoolIds: string[] = []
        if (profileData.school_id) schoolIds.push(profileData.school_id)

        const { data: extraSchools } = await supabase
          .from("teacher_schools")
          .select("school_id")
          .eq("teacher_id", userId)

        if (extraSchools) {
          for (const es of extraSchools) {
            if (!schoolIds.includes(es.school_id)) {
              schoolIds.push(es.school_id)
            }
          }
        }

        if (schoolIds.length > 0) {
          const { data: schoolsData } = await supabase
            .from("schools")
            .select("*")
            .in("id", schoolIds)

          const schools = schoolsData ?? []
          setAvailableSchools(schools)

          const storedId = localStorage.getItem("activeSchoolId")
          const target = storedId
            ? schools.find((s) => s.id === storedId)
            : schools[0]
          setSchool(target ?? null)
          setActiveSchoolId(target?.id ?? null)
        } else {
          setSchool(null)
          setActiveSchoolId(null)
        }
      } else if (profileData.school_id) {
        const { data: schoolData } = await supabase
          .from("schools")
          .select("*")
          .eq("id", profileData.school_id)
          .maybeSingle()
        const s = schoolData ?? null
        setSchool(s)
        setActiveSchoolId(s?.id ?? null)
      } else {
        setSchool(null)
        setActiveSchoolId(null)
      }
    } else {
      setProfile(null)
      setSchool(null)
      setAvailableSchools([])
      setActiveSchoolId(null)
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!mounted) return

      if (session) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUser(user)
          await fetchProfile(user.id)
        }
      }
      setIsLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (!mounted) return

        if (event === "SIGNED_OUT") {
          setUser(null)
          setProfile(null)
          setSchool(null)
          setIsLoading(false)
          router.push("/auth")
          return
        }

        if (event === "SIGNED_IN") {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            setUser(user)
            await fetchProfile(user.id)
          }
          return
        }

        if (event === "TOKEN_REFRESHED") {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            setUser(user)
            await fetchProfile(user.id)
          }
          router.refresh()
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile, router])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    if (error) throw error
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }

  const setActiveSchool = useCallback((s: School | null) => {
    setSchool(s)
    setActiveSchoolId(s?.id ?? null)
    if (s) {
      localStorage.setItem("activeSchoolId", s.id)
    } else {
      localStorage.removeItem("activeSchoolId")
    }
  }, [])

  const signOut = async () => {
    setActiveSchoolId(null)
    localStorage.removeItem("activeSchoolId")
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, school, availableSchools, setActiveSchool, isLoading, signIn, signOut, resetPassword, updatePassword }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
