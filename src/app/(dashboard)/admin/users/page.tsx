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
import { toast } from "sonner"
import { getAllSchools } from "@/services/schools"
import {
  getAllProfiles,
  getProfilesBySchool,
  getAllActiveProfiles,
  getAllPreceptorSchools,
  getPreceptorSchoolMembers,
  getTeacherSchoolMembers,
  getDeactivatedProfiles,
} from "@/services/users"

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
    firstName: string
    lastName: string
    role: string
    schoolIds: string[]
  }>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "preceptor",
    schoolIds: [],
  })

  const { data: schools } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      return getAllSchools()
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
      let extraIds: string[] = []

      if (selectedSchool) {
        const psData = await getPreceptorSchoolMembers(selectedSchool)
        const preceptorIds = psData.map((p) => p.preceptorId) ?? []

        const tsData = await getTeacherSchoolMembers(selectedSchool)
        const teacherIds = tsData.map((t) => t.teacherId) ?? []

        extraIds = [...preceptorIds, ...teacherIds]
      }

      if (selectedSchool) {
        return getProfilesBySchool(selectedSchool, extraIds)
      } else {
        return getAllActiveProfiles()
      }
    },
    enabled: profile?.role === "super_admin",
  })

  const { data: preceptorSchools } = useQuery({
    queryKey: ["preceptor-schools"],
    queryFn: async () => {
      return getAllPreceptorSchools()
    },
    enabled: profile?.role === "super_admin",
  })

  const { data: teacherSchoolsData } = useQuery({
    queryKey: ["teacher-schools"],
    queryFn: async () => {
      const tsData = await getTeacherSchoolMembers(selectedSchool)
      return tsData
    },
    enabled: profile?.role === "super_admin" && !!selectedSchool,
  })

  const preceptorSchoolMap = new Map<string, string[]>()
  if (preceptorSchools) {
    for (const ps of preceptorSchools) {
      const existing = preceptorSchoolMap.get(ps.preceptorId) ?? []
      existing.push(ps.schoolId)
      preceptorSchoolMap.set(ps.preceptorId, existing)
    }
  }

  const teacherSchoolMap = new Map<string, string[]>()
  if (teacherSchoolsData) {
    for (const ts of teacherSchoolsData) {
      const existing = teacherSchoolMap.get(ts.teacherId) ?? []
      existing.push(ts.schoolId)
      teacherSchoolMap.set(ts.teacherId, existing)
    }
  }

  const toggleCreateSchool = (schoolId: string) => {
    setNewUser((prev) => {
      const isPreceptor = prev.role === "preceptor"
      if (isPreceptor) {
        const ids = prev.schoolIds.includes(schoolId)
          ? prev.schoolIds.filter((id) => id !== schoolId)
          : [...prev.schoolIds, schoolId]
        return { ...prev, schoolIds: ids }
      } else {
        return { ...prev, schoolIds: prev.schoolIds.includes(schoolId) ? [] : [schoolId] }
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
          first_name: newUser.firstName,
          last_name: newUser.lastName,
          role: newUser.role,
          school_ids: newUser.schoolIds,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success("Usuario creado correctamente")
      setIsCreateOpen(false)
      setNewUser({ email: "", password: "", firstName: "", lastName: "", role: "preceptor", schoolIds: [] })
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
      return getDeactivatedProfiles()
    },
    enabled: profile?.role === "super_admin",
  })

  const [editUser, setEditUser] = useState<{
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
    schoolIds: string[]
  } | null>(null)

  const updateUser = useMutation({
    mutationFn: async () => {
      if (!editUser) throw new Error("No user selected")
      const res = await fetch("/api/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: editUser.id,
          first_name: editUser.firstName,
          last_name: editUser.lastName,
          email: editUser.email,
          school_ids: editUser.schoolIds,
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
      queryClient.invalidateQueries({ queryKey: ["teacher-schools"] })
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
        const ids = prev.schoolIds.includes(schoolId)
          ? prev.schoolIds.filter((id) => id !== schoolId)
          : [...prev.schoolIds, schoolId]
        return { ...prev, schoolIds: ids }
      } else {
        return { ...prev, schoolIds: prev.schoolIds.includes(schoolId) ? [] : [schoolId] }
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
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    placeholder="Nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apellido</Label>
                  <Input
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
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
                  onValueChange={(v) => setNewUser({ ...newUser, role: v ?? "preceptor", schoolIds: [] })}
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
                        checked={newUser.schoolIds.includes(s.id)}
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
                disabled={createUser.isPending || !newUser.email || !newUser.password || newUser.schoolIds.length === 0}
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
            const extraSchools = [
              ...(preceptorSchoolMap.get(u.id) ?? []),
              ...(teacherSchoolMap.get(u.id) ?? []),
            ]
            const allSchools = u.schoolId
              ? [u.schoolId, ...extraSchools.filter((id) => id !== u.schoolId)]
              : extraSchools

            return (
              <Card key={u.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10">
                        <AvatarFallback className="text-xs">
                          {u.firstName?.charAt(0) ?? "?"}
                          {u.lastName?.charAt(0) ?? ""}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-sm">
                          {u.firstName} {u.lastName}
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
                          firstName: u.firstName,
                          lastName: u.lastName,
                          email: u.email,
                          role: u.role,
                          schoolIds: allSchools,
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
                          {u.firstName?.charAt(0) ?? "?"}
                          {u.lastName?.charAt(0) ?? ""}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-sm">
                          {u.firstName} {u.lastName}
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
                    {u.schoolId ? "Desactivado" : "Desactivado — sin escuela asignada"}
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
              Gestionar escuelas de {editUser?.firstName} {editUser?.lastName}
              {editUser?.role === "preceptor" ? " (puede seleccionar varias)" : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={editUser?.firstName ?? ""}
                  onChange={(e) => setEditUser((prev) => prev ? { ...prev, firstName: e.target.value } : null)}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label>Apellido</Label>
                <Input
                  value={editUser?.lastName ?? ""}
                  onChange={(e) => setEditUser((prev) => prev ? { ...prev, lastName: e.target.value } : null)}
                  placeholder="Apellido"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editUser?.email ?? ""}
                onChange={(e) => setEditUser((prev) => prev ? { ...prev, email: e.target.value } : null)}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select
                value={editUser?.role ?? ""}
                onValueChange={(v) => setEditUser((prev) => prev ? { ...prev, role: v, schoolIds: v === "preceptor" ? prev.schoolIds : prev.schoolIds.length > 1 ? [prev.schoolIds[0]] : prev.schoolIds } : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cargo" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.filter((r) => r.value !== "super_admin").map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                      checked={editUser?.schoolIds.includes(s.id) ?? false}
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
              disabled={updateUser.isPending || !editUser?.schoolIds.length}
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
