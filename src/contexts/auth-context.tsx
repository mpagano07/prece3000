"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { authClient } from "@/lib/auth-client"
import type { Profile, School } from "@/types/database"
import { useRouter } from "next/navigation"
import { setActiveSchoolId } from "@/lib/active-school-client"

interface AuthContextValue {
  user: { id: string; email: string; name: string } | null
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
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [availableSchools, setAvailableSchools] = useState<School[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        setProfile(null)
        setSchool(null)
        setAvailableSchools([])
        setActiveSchoolId(null)
        return
      }
      const { profile: profileData, schools: schoolsData } = await res.json()
      if (!profileData) {
        setProfile(null)
        setSchool(null)
        setAvailableSchools([])
        setActiveSchoolId(null)
        return
      }

      setProfile(profileData)
      setAvailableSchools([])

      if (profileData.role === "super_admin") {
        const schools = schoolsData ?? []
        setAvailableSchools(schools)

        const storedId = localStorage.getItem("activeSchoolId")
        const target = storedId
          ? schools.find((s: School) => s.id === storedId)
          : schools[0]
        setSchool(target ?? null)
        setActiveSchoolId(target?.id ?? null)
      } else if (profileData.role === "preceptor" || profileData.role === "teacher") {
        const schools = schoolsData ?? []
        setAvailableSchools(schools)

        const storedId = localStorage.getItem("activeSchoolId")
        const target = storedId
          ? schools.find((s: School) => s.id === storedId)
          : schools[0]
        setSchool(target ?? null)
        setActiveSchoolId(target?.id ?? null)
      } else if (profileData.schoolId) {
        const schools = schoolsData ?? []
        const s = schools.find((sc: School) => sc.id === profileData.schoolId) ?? null
        setSchool(s)
        setActiveSchoolId(s?.id ?? null)
      } else {
        setSchool(null)
        setActiveSchoolId(null)
      }
    } catch {
      setProfile(null)
      setSchool(null)
      setAvailableSchools([])
      setActiveSchoolId(null)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data: session } = await authClient.getSession()

      if (!mounted) return

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          name: session.user.name ?? "",
        })
        await fetchProfile(session.user.id)
      }
      setIsLoading(false)
    }

    init()

    return () => {
      mounted = false
    }
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { error, data } = await authClient.signIn.email({
      email,
      password,
    })
    if (error) throw new Error(error.message ?? "Error signing in")
    if (data?.user?.id) {
      setUser({
        id: data.user.id,
        email: data.user.email ?? "",
        name: data.user.name ?? "",
      })
      await fetchProfile(data.user.id)
    }
  }

  const resetPassword = async (email: string) => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        redirectTo: `${window.location.origin}/auth/update-password`,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message ?? "Error sending reset email")
  }

  const updatePassword = async (password: string) => {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message ?? "Error updating password")
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
    await authClient.signOut()
    router.push("/auth")
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
