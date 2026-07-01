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

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  school: School | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()

    if (!error && profileData) {
      setProfile(profileData)

      if (profileData.school_id) {
        const { data: schoolData } = await supabase
          .from("schools")
          .select("*")
          .eq("id", profileData.school_id)
          .maybeSingle()
        setSchool(schoolData ?? null)
      } else {
        setSchool(null)
      }
    } else {
      setProfile(null)
      setSchool(null)
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

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            setUser(user)
            await fetchProfile(user.id)
          }
        }
        setIsLoading(false)
        router.refresh()
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

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, school, isLoading, signIn, signOut }}
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
