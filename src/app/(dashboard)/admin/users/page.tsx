"use client"

import { useState, useEffect } from "react"
import {
  Users,
  Plus,
  ShieldAlert,
  Mail,
  UserCog,
  UserX,
  Check,
  UserCheck,
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
import { Checkbox } from "@/components/ui/checkbox"
import { PageHeader } from "@/components/shared/page-header"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { useAuth } from "@/contexts/auth-context"
import { ROLES } from "@/lib/constants"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  school_admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  director: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  preceptor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  secretary: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  teacher: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
}

const CREATABLE_ROLES = ["school_admin", "director", "preceptor", "secretary", "teacher"] as const

export default function AdminUsersPage() {
  const { profile, school } = useAuth()
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deactivateUserId, setDeactivateUserId] = useState<string | null>(null)
  const [reactivateUserId, setReactivateUserId] = useState<string | null>(null)
  const [newUser, setNewUser] = useState<{
    email: string
    password: string
    first_name: string
    last_name: string
    role: string
    school_ids: string[]
  }>({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "preceptor",
    school_ids: [],
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

  const [selectedSchool, setSelectedSchool] = useState<string>(school?.id ?? "")

  useEffect(() => {
    if (school?.id) {
      setSelectedSchool(school.id)
    }
  }, [school?.id])

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", selectedSchool],
    queryFn: async () => {
      const supabase = createClient()
      let preceptorIds: string[] = []
      let teacherIds: string[] = []

      if (selectedSchool) {
        const { data: psData } = await supabase
          .from("preceptor_schools")
          .select("preceptor_id")
          .eq("school_id", selectedSchool)
        preceptorIds = psData?.map((p) => p.preceptor_id) ?? []

        const { data: tsData } = await supabase
          .from("teacher_schools")
          .select("teacher_id")
          .eq("school_id", selectedSchool)
        teacherIds = tsData?.map((t) => t.teacher_id) ?? []
      }

      let query = supabase
        .from("profiles")
        .select("*")
        .order("role")
        .order("last_name")

      if (selectedSchool) {
        const extraIds = [...preceptorIds, ...teacherIds]
        if (extraIds.length > 0) {
          query = query.is("deactivated_at", null).or(
            `school_id.eq.${selectedSchool},id.in.(${extraIds.join(",")})`
          )
        } else {
          query = query.eq("school_id", selectedSchool).is("deactivated_at", null)
        }
      } else {
        query = query.is("deactivated_at", null)
      }

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
    enabled: profile?.role === "super_admin",
  })

  const { data: preceptorSchools } = useQuery({
    queryKey: ["preceptor-schools"],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("preceptor_schools")
        .select("*")
      if (error) throw error
      return data ?? []
    },
    enabled: profile?.role === "super_admin",
  })

  const preceptorSchoolMap = new Map<string, string[]>()
  if (preceptorSchools) {
    for (const ps of preceptorSchools) {
      const existing = preceptorSchoolMap.get(ps.preceptor_id) ?? []
      existing.push(ps.school_id)
      preceptorSchoolMap.set(ps.preceptor_id, existing)
    }
  }

  const toggleCreateSchool = (schoolId: string) => {
    setNewUser((prev) => {
      const isPreceptor = prev.role === "preceptor"
      if (isPreceptor) {
        const ids = prev.school_ids.includes(schoolId)
          ? prev.school_ids.filter((id) => id !== schoolId)
          : [...prev.school_ids, schoolId]
        return { ...prev, school_ids: ids }
      } else {
        return { ...prev, school_ids: prev.school_ids.includes(schoolId) ? [] : [schoolId] }
      }
    })
  }

  const createUser = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          role: newUser.role,
          school_ids: newUser.school_ids,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success("Usuario creado correctamente")
      setIsCreateOpen(false)
      setNewUser({ email: "", password: "", first_name: "", last_name: "", role: "preceptor", school_ids: [] })
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["preceptor-schools"] })
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

  const reactivateUser = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch("/api/users/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, school_id: selectedSchool }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success("Usuario reactivado")
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["deactivated-users"] })
      setReactivateUserId(null)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al reactivar usuario")
    },
  })

  const { data: deactivatedUsers } = useQuery({
    queryKey: ["deactivated-users"],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("role", "super_admin")
        .order("last_name")
      if (error) throw error
      return (data ?? []).filter(
        (u) => u.deactivated_at !== null || u.school_id === null
      )
    },
    enabled: profile?.role === "super_admin",
  })

  const [editUser, setEditUser] = useState<{
    id: string
    first_name: string
    last_name: string
    role: string
    school_ids: string[]
  } | null>(null)

  const updateUser = useMutation({
    mutationFn: async () => {
      if (!editUser) throw new Error("No user selected")
      const res = await fetch("/api/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: editUser.id,
          school_ids: editUser.school_ids,
          role: editUser.role,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success("Usuario actualizado correctamente")
      setEditUser(null)
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["preceptor-schools"] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al actualizar usuario")
    },
  })

  const toggleEditSchool = (schoolId: string) => {
    setEditUser((prev) => {
      if (!prev) return null
      const isPreceptor = prev.role === "preceptor"
      if (isPreceptor) {
        const ids = prev.school_ids.includes(schoolId)
          ? prev.school_ids.filter((id) => id !== schoolId)
          : [...prev.school_ids, schoolId]
        return { ...prev, school_ids: ids }
      } else {
        return { ...prev, school_ids: prev.school_ids.includes(schoolId) ? [] : [schoolId] }
      }
    })
  }

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
            <SelectTrigger className="w-56 overflow-hidden">
              <SelectValue placeholder="Todas las escuelas" className="truncate min-w-0" />
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
                <Label>Rol</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(v) => setNewUser({ ...newUser, role: v ?? "preceptor", school_ids: [] })}
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
              <div className="space-y-2">
                <Label>
                  {newUser.role === "preceptor"
                    ? "Escuelas (puede seleccionar varias)"
                    : "Escuela"}
                </Label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
                  {schools?.length === 0 && (
                    <p className="text-xs text-muted-foreground">No hay escuelas disponibles</p>
                  )}
                  {schools?.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <Checkbox
                        checked={newUser.school_ids.includes(s.id)}
                        onCheckedChange={() => toggleCreateSchool(s.id)}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
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
                disabled={createUser.isPending || !newUser.email || !newUser.password || newUser.school_ids.length === 0}
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
          {users.map((u) => {
            const extraSchools = preceptorSchoolMap.get(u.id) ?? []
            const allSchools = u.school_id
              ? [u.school_id, ...extraSchools.filter((id) => id !== u.school_id)]
              : extraSchools

            return (
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
                <CardContent className="space-y-2">
                  {allSchools.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {allSchools.map((sid) => (
                        <Badge key={sid} variant="secondary" className="text-[10px]">
                          {schoolName[sid] ?? sid.slice(0, 8)}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {u.role !== "super_admin" && u.id !== profile?.id && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setEditUser({
                          id: u.id,
                          first_name: u.first_name,
                          last_name: u.last_name,
                          role: u.role,
                          school_ids: allSchools,
                        })}
                      >
                        <UserCog /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setDeactivateUserId(u.id)}
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
            )
          })}
        </div>
      )}

      {deactivatedUsers && deactivatedUsers.length > 0 && (
        <div className="pt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Usuarios desactivados ({deactivatedUsers.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deactivatedUsers.map((u) => (
              <Card key={u.id} className="opacity-60">
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
                  <p className="text-xs text-muted-foreground mb-2">
                    {u.school_id ? "Desactivado" : "Desactivado — sin escuela asignada"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setReactivateUserId(u.id)}
                    disabled={reactivateUser.isPending || !selectedSchool}
                  >
                    <UserCheck className="size-3.5 mr-1" />
                    Reactivar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Gestionar escuelas de {editUser?.first_name} {editUser?.last_name}
              {editUser?.role === "preceptor" ? " (puede seleccionar varias)" : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Escuelas asignadas</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
                {schools?.length === 0 && (
                  <p className="text-xs text-muted-foreground">No hay escuelas disponibles</p>
                )}
                {schools?.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={editUser?.school_ids.includes(s.id) ?? false}
                      onCheckedChange={() => toggleEditSchool(s.id)}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => updateUser.mutate()}
              disabled={updateUser.isPending || !editUser?.school_ids.length}
            >
              {updateUser.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deactivateUserId}
        onOpenChange={() => setDeactivateUserId(null)}
        title="Desactivar usuario"
        description="¿Está seguro de desactivar este usuario? Podrá reactivarlo más adelante."
        confirmLabel="Desactivar"
        loading={deactivateUser.isPending}
        onConfirm={() => {
          if (deactivateUserId) deactivateUser.mutate(deactivateUserId)
        }}
      />

      <ConfirmDialog
        open={!!reactivateUserId}
        onOpenChange={() => setReactivateUserId(null)}
        title="Reactivar usuario"
        description="¿Está seguro de reactivar este usuario en la escuela seleccionada?"
        confirmLabel="Reactivar"
        variant="default"
        loading={reactivateUser.isPending}
        onConfirm={() => {
          if (reactivateUserId) reactivateUser.mutate(reactivateUserId)
        }}
      />
    </div>
  )
}
