"use client"

import { useState, useMemo } from "react"
import {
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Clock,
  List,
} from "lucide-react"
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  isAfter,
} from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
} from "@/components/ui/card"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { useAuth } from "@/contexts/auth-context"
import { getAppointments, createAppointment, toggleAppointment } from "@/services/appointments"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { formatDate, formatDateTime } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { Appointment } from "@/types/database"

type AppointmentWithCompletion = Appointment



const TABS = [
  { value: "pending", label: "Pendientes" },
  { value: "today", label: "Hoy" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
]

const APPOINTMENT_TYPES = [
  { value: "meeting", label: "Reunión" },
  { value: "task", label: "Tarea" },
  { value: "reminder", label: "Recordatorio" },
  { value: "appointment", label: "Cita" },
  { value: "other", label: "Otro" },
]

export default function AgendaPage() {
  const { profile, school } = useAuth()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState("pending")
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments", profile?.id],
    queryFn: () => getAppointments(profile?.id ?? ""),
    enabled: !!profile?.id,
  })

  const toggleMutation = useMutation({
    mutationFn: toggleAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", profile?.id] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Error al actualizar")
    },
  })

  const createMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      toast.success("Cita creada correctamente")
      queryClient.invalidateQueries({ queryKey: ["appointments", profile?.id] })
      setIsCreateOpen(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Error al crear cita")
    },
  })

  const filtered = useMemo(() => {
    if (!appointments) return []
    const now = new Date()
    const items = appointments as AppointmentWithCompletion[]

    switch (tab) {
      case "pending":
        return items.filter(
          (a) => !a.completed && isAfter(new Date(a.startDate), now)
        )
      case "today":
        return items.filter((a) =>
          isWithinInterval(new Date(a.startDate), {
            start: startOfDay(now),
            end: endOfDay(now),
          })
        )
      case "week":
        return items.filter((a) =>
          isWithinInterval(new Date(a.startDate), {
            start: startOfWeek(now, { locale: es }),
            end: endOfWeek(now, { locale: es }),
          })
        )
      case "month":
        return items.filter((a) =>
          isWithinInterval(new Date(a.startDate), {
            start: startOfMonth(now),
            end: endOfMonth(now),
          })
        )
      default:
        return items
    }
  }, [appointments, tab])

  return (
    <div className="space-y-6">
      <PageHeader title="Agenda Personal" description="Citas, tareas y recordatorios">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button><Plus className="size-4" /> Nueva</Button>} />
          <DialogContent className="sm:max-w-lg">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget
                const data = new FormData(form)
                createMutation.mutate({
                  schoolId: school?.id ?? "",
                  userId: profile?.id ?? "",
                  title: data.get("title") as string,
                  description: (data.get("description") as string) || null,
                  startDate: new Date(data.get("start_date") as string).toISOString(),
                  endDate: data.get("end_date")
                    ? new Date(data.get("end_date") as string).toISOString()
                    : null,
                  type: (data.get("type") as string) || "other",
                })
              }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>Nueva Cita / Tarea</DialogTitle>
                <DialogDescription>
                  Creá un nuevo elemento en tu agenda personal.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="ag-title">Título</Label>
                  <Input
                    id="ag-title"
                    name="title"
                    placeholder="Título de la cita o tarea"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ag-type">Tipo</Label>
                  <Select name="type" defaultValue="other">
                    <SelectTrigger id="ag-type">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {APPOINTMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ag-description">Descripción</Label>
                  <Textarea
                    id="ag-description"
                    name="description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ag-start">Fecha/Hora inicio</Label>
                    <Input
                      id="ag-start"
                      name="start_date"
                      type="datetime-local"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ag-end">Fecha/Hora fin</Label>
                    <Input
                      id="ag-end"
                      name="end_date"
                      type="datetime-local"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {filtered.length === 0 && !isLoading && (
        <EmptyState
          icon={<List className="size-12" />}
          title="Sin elementos"
          description={
            tab === "pending"
              ? "No tenés citas o tareas pendientes"
              : "No hay elementos en este período"
          }
          action={{ label: "Nueva Cita", onClick: () => setIsCreateOpen(true) }}
        />
      )}

      <div className="grid gap-2">
        {filtered.map((appointment) => {
          const appt = appointment as AppointmentWithCompletion
          return (
          <Card
            key={appt.id}
            className={cn(
              "transition-colors",
              appt.completed && "opacity-60"
            )}
          >
            <CardHeader>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleMutation.mutate(appt.id)}
                  className="mt-0.5 shrink-0"
                >
                  {appt.completed ? (
                    <CheckCircle2 className="size-5 text-green-500" />
                  ) : (
                    <Circle className="size-5 text-muted-foreground hover:text-primary transition-colors" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle
                        className={cn(
                          "text-sm",
                          appt.completed && "line-through"
                        )}
                      >
                        {appt.title}
                      </CardTitle>
                      {appt.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {appt.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {APPOINTMENT_TYPES.find((t) => t.value === appt.type)
                        ?.label || appt.type}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                {formatDateTime(appt.startDate)}
                {appt.endDate && (
                  <> - {formatDateTime(appt.endDate)}</>
                )}
              </div>
            </CardContent>
          </Card>
        )})}
      </div>
    </div>
  )
}
