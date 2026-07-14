"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  UserPlus,
  Mail,
  Phone,
  ShieldAlert,
  Calendar,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { useAuth } from "@/contexts/auth-context"
import { getTeachersBySchool, deactivateTeacher, reactivateTeacher, updateTeacher, type TeacherWithSchoolStatus } from "@/services/teachers"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getInitials, cn } from "@/lib/utils"
import { ScheduleConfigDialog } from "@/components/employee/schedule-config-dialog"
import { ScheduleEditor, type ScheduleSlot } from "@/components/employee/schedule-editor"
import { DAY_LABELS } from "@/lib/constants"
import type { Profile } from "@/types/database"

function useTeachers() {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["teachers", school?.id],
    queryFn: async () => {
      if (!school?.id) throw new Error("No se encontró la institución asociada")
      return getTeachersBySchool(school.id)
    },
    enabled: !!school?.id,
  })
}

export default function TeachersPage() {
  const { profile, school } = useAuth()
  const queryClient = useQueryClient()
  const { data: teachers, isLoading, error } = useTeachers()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editTeacher, setEditTeacher] = useState<Profile | null>(null)
  const [deleteTeacherId, setDeleteTeacherId] = useState<string | null>(null)
  const [reactivateTeacherId, setReactivateTeacherId] = useState<string | null>(null)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [addExistingOpen, setAddExistingOpen] = useState(false)

  const { data: empScheduleData } = useQuery({
    queryKey: ["teacher-schedules", profile?.schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/employee-schedules?school_id=${profile?.schoolId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data.schedules as Record<string, Record<string, { timeStart: string; timeEnd: string }[]>> ?? {}
    },
    enabled: !!profile?.schoolId,
  })

  const { data: divScheduleData } = useQuery({
    queryKey: ["teacher-division-schedules", profile?.schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/division-schedules?school_id=${profile?.schoolId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      type Row = { teacherId: string; dayOfWeek: number; timeStart: string; timeEnd: string; subject?: { name: string } }
      return (data.schedules ?? []) as Row[]
    },
    enabled: !!profile?.schoolId,
  })

  const teacherSchedules = useMemo(() => {
    const map = new Map<string, Record<number, { timeStart: string; timeEnd: string; subject?: string }[]>>()

    for (const [empId, days] of Object.entries(empScheduleData ?? {})) {
      for (const [dayStr, slots] of Object.entries(days)) {
        const day = Number(dayStr)
        if (!map.has(empId)) map.set(empId, {})
        if (!map.get(empId)![day]) map.get(empId)![day] = []
        for (const slot of slots) {
          map.get(empId)![day].push({ timeStart: slot.timeStart, timeEnd: slot.timeEnd })
        }
      }
    }

    for (const row of divScheduleData ?? []) {
      const day = row.dayOfWeek
      if (!map.has(row.teacherId)) map.set(row.teacherId, {})
      if (!map.get(row.teacherId)![day]) map.get(row.teacherId)![day] = []
      map.get(row.teacherId)![day].push({
        timeStart: row.timeStart.slice(0, 5),
        timeEnd: row.timeEnd.slice(0, 5),
        subject: row.subject?.name,
      })
    }

    return map
  }, [empScheduleData, divScheduleData])

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deactivateTeacher(id, school?.id)
    },
    onSuccess: () => {
      toast.success("Docente desactivado correctamente")
      queryClient.invalidateQueries({ queryKey: ["teachers"] })
      setDeleteTeacherId(null)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al desactivar docente")
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return reactivateTeacher(id, school?.id)
    },
    onSuccess: () => {
      toast.success("Docente reactivado correctamente")
      queryClient.invalidateQueries({ queryKey: ["teachers"] })
      setReactivateTeacherId(null)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al reactivar docente")
    },
  })

  if (profile?.role !== "school_admin" && profile?.role !== "director" && profile?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="mb-4 size-12 text-muted-foreground" />
        <h3 className="text-sm font-medium">Acceso restringido</h3>
        <p className="text-xs text-muted-foreground">
          Solo los administradores escolares pueden gestionar docentes.
        </p>
      </div>
    )
  }

  if (isLoading) return <LoadingScreen />
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <p className="text-destructive">Error al cargar docentes</p>
        <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Docentes" description="Gestión de docentes de la institución">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setScheduleDialogOpen(true)}>
            <Calendar className="size-4" />
            Horarios
          </Button>
          <Dialog open={addExistingOpen} onOpenChange={setAddExistingOpen}>
            <DialogTrigger render={<Button variant="outline"><UserPlus className="size-4" /> Agregar existente</Button>} />
            <DialogContent className="sm:max-w-md">
              <AddExistingTeacherDialog
                schoolId={school?.id ?? ""}
                onClose={() => setAddExistingOpen(false)}
                onSuccess={() => {
                  setAddExistingOpen(false)
                  queryClient.invalidateQueries({ queryKey: ["teachers"] })
                }}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger render={<Button><Plus className="size-4" /> Nuevo Docente</Button>} />
            <DialogContent className="sm:max-w-md">
              <TeacherForm
                onSuccess={() => setIsCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {teachers && teachers.length === 0 ? (
        <EmptyState
          icon={<Users className="size-12" />}
          title="Sin docentes"
          description="No hay docentes registrados en la institución"
          action={{ label: "Nuevo Docente", onClick: () => setIsCreateOpen(true) }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teachers?.map((teacher) => {
            const isDeactivated = !!(teacher as TeacherWithSchoolStatus).schoolDeactivatedAt
            return (
            <Card key={teacher.id} className={cn(isDeactivated && "opacity-60")}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(teacher.firstName, teacher.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm">
                        {teacher.firstName} {teacher.lastName}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {teacher.email}
                      </CardDescription>
                    </div>
                  </div>
                  {isDeactivated && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">Desactivado</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="size-3.5" />
                    <span>{teacher.email}</span>
                  </div>
                  {teacher.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="size-3.5" />
                      <span>{teacher.phone}</span>
                    </div>
                  )}
                </div>
                {teacherSchedules.has(teacher.id) && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">Horario semanal</p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: 7 }).map((_, day) => {
                        const slots = teacherSchedules.get(teacher.id)?.[day]
                        if (!slots || slots.length === 0) return null
                        return (
                          <div key={day} className="rounded-md bg-muted/50 px-1.5 py-0.5">
                            <span className="text-[10px] font-medium text-muted-foreground">{DAY_LABELS[day]}</span>
                            <div className="mt-0.5 space-y-0.5">
                              {slots.map((slot, i) => (
                                <p key={i} className="text-[9px] text-muted-foreground whitespace-nowrap">
                                  {slot.subject ? <span className="font-medium">{slot.subject} </span> : null}
                                  {slot.timeStart}–{slot.timeEnd}
                                </p>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  {!isDeactivated ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditTeacher(teacher)}
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTeacherId(teacher.id)}
                      >
                        <Trash2 className="size-3.5" />
                        Desactivar
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReactivateTeacherId(teacher.id)}
                    >
                      <UserCheck className="size-3.5" />
                      Reactivar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}

      <Dialog open={!!editTeacher} onOpenChange={(open) => !open && setEditTeacher(null)}>
        <DialogContent className="sm:max-w-md">
          <TeacherForm
            teacher={editTeacher}
            onSuccess={() => setEditTeacher(null)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTeacherId}
        onOpenChange={() => setDeleteTeacherId(null)}
        title="Desactivar docente"
        description="¿Está seguro de desactivar este docente? Podrá reactivarlo más adelante."
        confirmLabel="Desactivar"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTeacherId) deleteMutation.mutate(deleteTeacherId)
        }}
      />

      <ConfirmDialog
        open={!!reactivateTeacherId}
        onOpenChange={() => setReactivateTeacherId(null)}
        title="Reactivar docente"
        description="¿Está seguro de reactivar este docente?"
        confirmLabel="Reactivar"
        variant="default"
        loading={reactivateMutation.isPending}
        onConfirm={() => {
          if (reactivateTeacherId) reactivateMutation.mutate(reactivateTeacherId)
        }}
      />

      <ScheduleConfigDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
      />
    </div>
  )
}

function AddExistingTeacherDialog({
  schoolId,
  onClose,
  onSuccess,
}: {
  schoolId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [email, setEmail] = useState("")
  const [searching, setSearching] = useState(false)
  const [foundTeacher, setFoundTeacher] = useState<{
    id: string
    firstName: string
    lastName: string
    email: string
  } | null>(null)
  const [error, setError] = useState("")
  const [adding, setAdding] = useState(false)
  const [alreadyAssigned, setAlreadyAssigned] = useState(false)

  const handleSearch = async () => {
    if (!email) return
    setSearching(true)
    setError("")
    setFoundTeacher(null)
    setAlreadyAssigned(false)
    try {
      const res = await fetch("/api/teachers/add-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, school_id: schoolId, mode: "search" }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 404) {
          setError("No se encontró un usuario con ese email")
        } else {
          setError(data.error)
        }
        return
      }
      setFoundTeacher(data.teacher)
      setAlreadyAssigned(!!data.already_assigned)
      if (data.already_assigned) {
        toast.success("El docente ya está en esta escuela")
      } else {
        toast.success("Docente encontrado")
      }
    } catch {
      setError("Error al buscar docente")
    } finally {
      setSearching(false)
    }
  }

  const handleAdd = async () => {
    if (!foundTeacher) return
    setAdding(true)
    try {
      const res = await fetch("/api/teachers/add-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: foundTeacher.email, school_id: schoolId, mode: "add" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Docente agregado correctamente")
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al agregar docente")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Agregar docente existente</DialogTitle>
        <DialogDescription>
          Ingresá el email del docente que ya trabaja en otra institución para agregarlo a esta escuela.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="ae-email">Email del docente</Label>
            <Input
              id="ae-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setFoundTeacher(null)
                setError("")
                setAlreadyAssigned(false)
              }}
              placeholder="docente@ejemplo.com"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch()
              }}
            />
          </div>
          <Button onClick={handleSearch} disabled={searching || !email}>
            <Search className="size-4" />
            {searching ? "Buscando..." : "Buscar"}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {foundTeacher && (
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {getInitials(foundTeacher.firstName, foundTeacher.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {foundTeacher.firstName} {foundTeacher.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{foundTeacher.email}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              {!alreadyAssigned && (
                <Button onClick={handleAdd} disabled={adding}>
                  {adding ? "Agregando..." : "Agregar a esta escuela"}
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </div>
    </div>
  )
}

function TeacherForm({
  teacher,
  onSuccess,
}: {
  teacher?: Profile | null
  onSuccess: () => void
}) {
  const { school } = useAuth()
  const queryClient = useQueryClient()
  const [firstName, setFirstName] = useState(teacher?.firstName || "")
  const [lastName, setLastName] = useState(teacher?.lastName || "")
  const [email, setEmail] = useState(teacher?.email || "")
  const [phone, setPhone] = useState(teacher?.phone || "")
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([])

  const { data: existingSchedule } = useQuery({
    queryKey: ["teacher-edit-schedule", teacher?.id],
    queryFn: async () => {
      if (!teacher || !school?.id) return []

      // 1. Load employee_schedules
      const empRes = await fetch(`/api/employee-schedules?school_id=${school.id}`)
      const empData = await empRes.json()
      if (!empRes.ok) throw new Error(empData.error)
      const empDays = (empData.schedules ?? {})[teacher.id] as Record<string, { timeStart: string; timeEnd: string }[]> | undefined

      const seenDays = new Set<number>()
      const slots: ScheduleSlot[] = []

      for (const [dayStr, timeSlots] of Object.entries(empDays ?? {})) {
        for (const ts of timeSlots) {
          slots.push({ dayOfWeek: Number(dayStr), timeStart: ts.timeStart, timeEnd: ts.timeEnd })
          seenDays.add(Number(dayStr))
        }
      }

      // 2. Also load division_schedules and merge days not already present
      const divRes = await fetch(`/api/division-schedules?school_id=${school.id}`)
      if (divRes.ok) {
        const divData = await divRes.json()
        for (const s of divData.schedules ?? []) {
          if (s.teacherId !== teacher.id) continue
          if (!seenDays.has(s.dayOfWeek)) {
            slots.push({
              dayOfWeek: s.dayOfWeek,
              timeStart: s.timeStart.slice(0, 5),
              timeEnd: s.timeEnd.slice(0, 5),
            })
            seenDays.add(s.dayOfWeek)
          }
        }
      }

      slots.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.timeStart.localeCompare(b.timeStart))
      return slots
    },
    enabled: !!teacher && !!school?.id,
  })

  useEffect(() => {
    if (existingSchedule) {
      setScheduleSlots(existingSchedule)
    }
  }, [existingSchedule])

  const saveSchedule = async (employeeId: string) => {
    const days: Record<string, { timeStart: string; timeEnd: string }[]> = {}
    for (const slot of scheduleSlots) {
      const key = String(slot.dayOfWeek)
      if (!days[key]) days[key] = []
      days[key].push({ timeStart: slot.timeStart, timeEnd: slot.timeEnd })
    }
    const payload: Record<string, Record<string, { timeStart: string; timeEnd: string }[]>> = {
      [employeeId]: days,
    }
    const res = await fetch("/api/employee-schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ school_id: school!.id, schedules: payload }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (teacher) {
        await updateTeacher(teacher.id, { firstName, lastName, email, phone })
        await saveSchedule(teacher.id)
        toast.success("Docente actualizado correctamente")
        queryClient.invalidateQueries({ queryKey: ["teachers"] })
        queryClient.invalidateQueries({ queryKey: ["teacher-schedules"] })
        onSuccess()
      } else {
        if (!school?.id) throw new Error("No se encontró la institución asociada")
        if (!password) throw new Error("La contraseña es requerida")
        const res = await fetch("/api/users/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            first_name: firstName,
            last_name: lastName,
            role: "teacher",
            school_ids: [school.id],
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        const newTeacherId = data.user?.id
        if (newTeacherId && scheduleSlots.length > 0) {
          await saveSchedule(newTeacherId)
        }
        toast.success("Docente creado correctamente")
        queryClient.invalidateQueries({ queryKey: ["teachers"] })
        queryClient.invalidateQueries({ queryKey: ["teacher-schedules"] })
        onSuccess()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar docente")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{teacher ? "Editar Docente" : "Nuevo Docente"}</DialogTitle>
        <DialogDescription>
          {teacher
            ? "Modificá los datos y horarios del docente."
            : "Completá los datos y horarios para registrar un nuevo docente."}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="t-first-name">Nombre</Label>
            <Input
              id="t-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-last-name">Apellido</Label>
            <Input
              id="t-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="t-email">Email</Label>
          <Input
            id="t-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="t-phone">Teléfono</Label>
          <Input
            id="t-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        {!teacher && (
          <div className="space-y-2">
            <Label htmlFor="t-password">Contraseña</Label>
            <Input
              id="t-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        )}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Horario semanal</Label>
          <ScheduleEditor
            slots={scheduleSlots}
            onChange={setScheduleSlots}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : teacher ? "Guardar Cambios" : "Crear Docente"}
        </Button>
      </DialogFooter>
    </form>
  )
}
