"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { Loader2, ArrowLeft, MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"

const forgotSchema = z.object({
  email: z.string().email("Ingrese un email válido"),
})

type ForgotForm = z.infer<typeof forgotSchema>

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  })

  const onSubmit = async (data: ForgotForm) => {
    setError(null)
    try {
      await resetPassword(data.email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el correo")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold">
            P
          </div>
          <CardTitle>Recuperar Contraseña</CardTitle>
          <CardDescription>
            {sent
              ? "Revisá tu bandeja de entrada"
              : "Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 rounded-lg bg-primary/10 p-4 text-center text-sm text-primary">
                <MailCheck className="size-8" />
                <p>
                  Si existe una cuenta con ese email, recibirás un enlace para restablecer tu
                  contraseña.
                </p>
              </div>
              <Link
                href="/auth"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 h-8 text-sm font-medium whitespace-nowrap hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
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
                    Enviando...
                  </>
                ) : (
                  "Enviar enlace"
                )}
              </Button>

              <Link
                href="/auth"
                className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                <ArrowLeft className="size-4" />
                Volver al inicio de sesión
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
