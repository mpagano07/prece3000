"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Eye, EyeOff, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { createClient } from "@/lib/supabase/client"

const updateSchema = z
  .object({
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirm: z.string().min(1, "Confirmá la contraseña"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  })

type UpdateForm = z.infer<typeof updateSchema>

export default function UpdatePasswordPage() {
  const router = useRouter()
  const { updatePassword } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isRecovery, setIsRecovery] = useState(false)
  const [checking, setChecking] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateForm>({
    resolver: zodResolver(updateSchema),
  })

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true)
      }
      setChecking(false)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsRecovery(true)
      }
      setChecking(false)
    })
  }, [])

  const onSubmit = async (data: UpdateForm) => {
    setError(null)
    try {
      await updatePassword(data.password)
      setSuccess(true)
      setTimeout(() => router.push("/dashboard"), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar la contraseña")
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <KeyRound className="size-6" />
            </div>
            <CardTitle>Contraseña actualizada</CardTitle>
            <CardDescription>Redirigiendo al dashboard...</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/auth"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 h-8 text-sm font-medium whitespace-nowrap hover:bg-muted hover:text-foreground"
            >
              Volver al inicio de sesión
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <CardTitle>Enlace inválido</CardTitle>
            <CardDescription>
              Este enlace de recuperación no es válido o ha expirado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/auth/forgot-password"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 h-8 text-sm font-medium whitespace-nowrap hover:bg-muted hover:text-foreground"
            >
              Solicitar nuevo enlace
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <KeyRound className="size-6" />
          </div>
          <CardTitle>Nueva contraseña</CardTitle>
          <CardDescription>Ingresá tu nueva contraseña</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="pr-9"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar contraseña</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="pr-9"
                  {...register("confirm")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.confirm && (
                <p className="text-xs text-destructive">{errors.confirm.message}</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                "Actualizar contraseña"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
