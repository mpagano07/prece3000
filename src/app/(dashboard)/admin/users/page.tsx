"use client"

import { useState } from "react"
import {
  Users,
  Plus,
  ShieldAlert,
  Mail,
  UserCog,
  UserX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { EmptyState } from "@/components/shared/empty-state"
import { useAuth } from "@/contexts/auth-context"
import { ROLES } from "@/lib/constants"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  school_admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  preceptor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  secretary: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  teacher: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
}

const CREATABLE_ROLES = ["school_admin", "preceptor", "secretary", "teacher"] as const

export default function AdminUsersPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newUser, setNewUser] = useState<{
    email: string
    password: string
    first_name: string
    last_name: string
    role: string
    school_id: string
  }>({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "preceptor",
    school_id: "",
  })

  const { data: schools } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("schools")
        .select("id, name")
        .order("name")
      if (error) throw error
      return data ?? []
    },
    enabled: profile?.role === "super_admin",
  })

  const schoolName = schools?.reduce((acc, s) => {
    acc[s.id] = s.name
    return acc
  }, {} as Record<string, string>) ?? {}

  const [selectedSchool, setSelectedSchool] = useState<string>("")

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", selectedSchool],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from("profiles")
        .select("*")
        .order("role")
        .order("last_name")

      if (selectedSchool) {
        query = query.eq("school_id", selectedSchool)
      }

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
    enabled: profile?.role === "super_admin",
  })

  const createUser = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success("Usuario creado correctamente")
      setIsCreateOpen(false)
      setNewUser({ email: "", password: "", first_name: "", last_name: "", role: "preceptor", school_id: "" })
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al crear usuario")
    },
  })

  const deactivateUser = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch("/api/users/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success("Usuario desactivado")
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al desactivar usuario")
    },
  })

  if (profile?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="mb-4 size-12 text-muted-foreground" />
        <h3 className="text-sm font-medium">Acceso restringido</h3>
        <p className="text-xs text-muted-foreground">
          Solo el Super Administrador puede gestionar usuarios.
        </p>
      </div>
    )
  }

  if (isLoading) return <LoadingScreen />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Gestioná los usuarios de las instituciones"
      >
        <div className="flex items-center gap-2">
          <Select
            value={selectedSchool}
            onValueChange={(v) => setSelectedSchool(v ?? "")}
            getLabel={(v) => (v ? schoolName[v] ?? v : "Todas las escuelas")}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Todas las escuelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las escuelas</SelectItem>
              {schools?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={
            <Button>
              <Plus /> Nuevo Usuario
            </Button>
          } />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Usuario</DialogTitle>
              <DialogDescription>
                Los datos de acceso se enviarán al email registrado.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    placeholder="Nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apellido</Label>
                  <Input
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    placeholder="Apellido"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label>Escuela</Label>
                <Select
                  value={newUser.school_id}
                  onValueChange={(v) => setNewUser({ ...newUser, school_id: v ?? "" })}
                  getLabel={(v) => (v ? schoolName[v] ?? v : "Seleccionar escuela")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar escuela" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(v) => setNewUser({ ...newUser, role: v ?? "preceptor" })}
                  getLabel={(v) => ROLES.find((r) => r.value === v)?.label ?? v ?? "Seleccionar"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREATABLE_ROLES.map((r) => {
                      const roleDef = ROLES.find((rl) => rl.value === r)
                      return (
                        <SelectItem key={r} value={r}>
                          {roleDef?.label ?? r}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => createUser.mutate()}
                disabled={createUser.isPending || !newUser.email || !newUser.password || !newUser.school_id}
              >
                {createUser.isPending ? "Creando..." : "Crear Usuario"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </PageHeader>

      {!users || users.length === 0 ? (
        <EmptyState
          icon={<Users className="size-8" />}
          title="Sin usuarios"
          description={selectedSchool ? "No hay usuarios en esta escuela." : "No hay usuarios en el sistema."}
          action={{ label: "Crear primer usuario", onClick: () => setIsCreateOpen(true) }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <Card key={u.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarFallback className="text-xs">
                        {u.first_name?.charAt(0) ?? "?"}
                        {u.last_name?.charAt(0) ?? ""}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm">
                        {u.first_name} {u.last_name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <Mail className="size-3" />
                        {u.email}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={ROLE_COLORS[u.role] ?? ""}>
                    {ROLES.find((r) => r.value === u.role)?.label ?? u.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {u.role !== "super_admin" && u.id !== profile?.id && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        if (confirm("¿Estás seguro de desactivar este usuario?")) {
                          deactivateUser.mutate(u.id)
                        }
                      }}
                      disabled={deactivateUser.isPending}
                    >
                      <UserX /> Desactivar
                    </Button>
                  </div>
                )}
                {u.role === "super_admin" && (
                  <span className="text-xs text-muted-foreground">Admin del sistema</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
