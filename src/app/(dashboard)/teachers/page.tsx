"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Mail,
  Phone,
  ShieldAlert,
  Calendar,
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
import { TeacherService } from "@/services/teachers"
import { createClient } from "@/lib/supabase/client"
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
      const supabase = createClient()
      if (!school?.id) throw new Error("No se encontró la institución asociada")
      return TeacherService.getBySchool(supabase, school.id)
    },
    enabled: !!school?.id,
  })
}

export default function TeachersPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: teachers, isLoading, error } = useTeachers()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editTeacher, setEditTeacher] = useState<Profile | null>(null)
  const [deleteTeacherId, setDeleteTeacherId] = useState<string | null>(null)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)

  const { data: scheduleData } = useQuery({
    queryKey: ["teacher-schedules", profile?.school_id],
    queryFn: async () => {
      const res = await fetch(`/api/employee-schedules?school_id=${profile?.school_id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data.schedules as Record<string, Record<string, { time_start: string; time_end: string }[]>> ?? {}
    },
    enabled: !!profile?.school_id,
  })

  const teacherSchedules = useMemo(() => {
    if (!scheduleData) return new Map<string, Record<number, { time_start: string; time_end: string }[]>>()
    const map = new Map<string, Record<number, { time_start: string; time_end: string }[]>>()
    for (const [empId, days] of Object.entries(scheduleData)) {
      const dayMap: Record<number, { time_start: string; time_end: string }[]> = {}
      for (const [dayStr, slots] of Object.entries(days)) {
        dayMap[Number(dayStr)] = slots
      }
      map.set(empId, dayMap)
    }
    return map
  }, [scheduleData])

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      return TeacherService.delete(supabase, id)
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
          {teachers?.map((teacher) => (
            <Card key={teacher.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(teacher.first_name, teacher.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm">
                        {teacher.first_name} {teacher.last_name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {teacher.email}
                      </CardDescription>
                    </div>
                  </div>
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
                                  {slot.time_start}–{slot.time_end}
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
                </div>
              </CardContent>
            </Card>
          ))}
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

      <ScheduleConfigDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
      />
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
  const [firstName, setFirstName] = useState(teacher?.first_name || "")
  const [lastName, setLastName] = useState(teacher?.last_name || "")
  const [email, setEmail] = useState(teacher?.email || "")
  const [phone, setPhone] = useState(teacher?.phone || "")
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([])

  const { data: existingSchedule } = useQuery({
    queryKey: ["teacher-edit-schedule", teacher?.id],
    queryFn: async () => {
      if (!teacher || !school?.id) return []
      const res = await fetch(`/api/employee-schedules?school_id=${school.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const empDays = (data.schedules ?? {})[teacher.id] as Record<string, { time_start: string; time_end: string }[]> | undefined
      if (!empDays) return []
      const slots: ScheduleSlot[] = []
      for (const [dayStr, timeSlots] of Object.entries(empDays)) {
        for (const ts of timeSlots) {
          slots.push({ day_of_week: Number(dayStr), time_start: ts.time_start, time_end: ts.time_end })
        }
      }
      slots.sort((a, b) => a.day_of_week - b.day_of_week || a.time_start.localeCompare(b.time_start))
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
    const days: Record<string, { time_start: string; time_end: string }[]> = {}
    for (const slot of scheduleSlots) {
      const key = String(slot.day_of_week)
      if (!days[key]) days[key] = []
      days[key].push({ time_start: slot.time_start, time_end: slot.time_end })
    }
    const payload: Record<string, Record<string, { time_start: string; time_end: string }[]>> = {
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
      const supabase = createClient()
      if (teacher) {
        await TeacherService.update(supabase, teacher.id, { first_name: firstName, last_name: lastName, email, phone })
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
            school_id: school.id,
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
