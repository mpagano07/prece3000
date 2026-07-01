"use client"

import { useState } from "react"
import {
  User,
  School,
  Moon,
  Sun,
  Lock,
  Save,
  Shield,
  Mail,
  Phone,
  MapPin,
} from "lucide-react"
import { useTheme } from "@/contexts/theme-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { PageHeader } from "@/components/shared/page-header"
import { useAuth } from "@/contexts/auth-context"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function SettingsPage() {
  const { user, profile, school } = useAuth()
  const { theme, setTheme } = useTheme()
  const supabase = createClient()

  const [firstName, setFirstName] = useState(profile?.first_name || "")
  const [lastName, setLastName] = useState(profile?.last_name || "")
  const [email, setEmail] = useState(profile?.email || "")
  const [phone, setPhone] = useState(profile?.phone || "")
  const [saving, setSaving] = useState(false)

  const [schoolName, setSchoolName] = useState(school?.name || "")
  const [schoolAddress, setSchoolAddress] = useState(school?.address || "")
  const [schoolPhone, setSchoolPhone] = useState(school?.phone || "")
  const [schoolEmail, setSchoolEmail] = useState(school?.email || "")
  const [savingSchool, setSavingSchool] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ first_name: firstName, last_name: lastName, phone })
        .eq("id", profile.id)
      if (error) throw error
      toast.success("Perfil actualizado correctamente")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar perfil")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!school) return
    setSavingSchool(true)
    try {
      const { error } = await supabase
        .from("schools")
        .update({ name: schoolName, address: schoolAddress, phone: schoolPhone, email: schoolEmail })
        .eq("id", school.id)
      if (error) throw error
      toast.success("Información de la escuela actualizada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar escuela")
    } finally {
      setSavingSchool(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden")
      return
    }
    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres")
      return
    }
    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success("Contraseña actualizada correctamente")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar contraseña")
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Configuración" description="Administrá tu perfil y preferencias" />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">Perfil de Usuario</CardTitle>
          </div>
          <CardDescription>Actualizá tus datos personales</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">Nombre</Label>
                <Input
                  id="first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Apellido</Label>
                <Input
                  id="last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input
                id="settings-email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                El email no se puede modificar desde aquí
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-phone">Teléfono</Label>
              <Input
                id="settings-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+54 11 1234-5678"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? (
                "Guardando..."
              ) : (
                <>
                  <Save className="size-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {profile?.role === "school_admin" && school && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <School className="size-5 text-muted-foreground" />
              <CardTitle className="text-base">Información de la Escuela</CardTitle>
            </div>
            <CardDescription>Datos de la institución</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSchool} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="school-name">Nombre</Label>
                <Input
                  id="school-name"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-address">Dirección</Label>
                <Input
                  id="school-address"
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                  placeholder="Dirección de la escuela"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="school-phone">Teléfono</Label>
                  <Input
                    id="school-phone"
                    value={schoolPhone}
                    onChange={(e) => setSchoolPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-email">Email</Label>
                  <Input
                    id="school-email"
                    type="email"
                    value={schoolEmail}
                    onChange={(e) => setSchoolEmail(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" disabled={savingSchool}>
                {savingSchool ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {theme === "dark" ? (
              <Moon className="size-5 text-muted-foreground" />
            ) : (
              <Sun className="size-5 text-muted-foreground" />
            )}
            <CardTitle className="text-base">Apariencia</CardTitle>
          </div>
          <CardDescription>Cambiá entre modo claro y oscuro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === "dark" ? (
                <Moon className="size-4 text-muted-foreground" />
              ) : (
                <Sun className="size-4 text-muted-foreground" />
              )}
              <span className="text-sm">
                Modo {theme === "dark" ? "oscuro" : "claro"}
              </span>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">Cambiar Contraseña</CardTitle>
          </div>
          <CardDescription>Actualizá tu contraseña de acceso</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Contraseña actual</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? "Cambiando..." : "Cambiar Contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">Información de la Cuenta</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Rol</span>
              <span className="font-medium capitalize">
                {profile?.role === "super_admin"
                  ? "Super Administrador"
                  : profile?.role === "school_admin"
                    ? "Administrador Escolar"
                    : profile?.role === "preceptor"
                      ? "Preceptor"
                      : profile?.role === "secretary"
                        ? "Secretario"
                        : profile?.role}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Miembro desde</span>
              <span className="font-medium">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("es-AR")
                  : "—"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Escuela</span>
              <span className="font-medium">{school?.name || "Sin escuela"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
