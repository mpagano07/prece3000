"use client"

import { useState, useMemo } from "react"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
} from "lucide-react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import { useAuth } from "@/contexts/auth-context"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { useQuery } from "@tanstack/react-query"
import { useCalendarEvents, useCreateEvent } from "@/hooks/use-calendar"
import { EVENT_TYPES } from "@/lib/constants"
import { formatDateTime } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { DAY_LABELS } from "@/lib/constants"
import type { EventType } from "@/types/database"

const EVENT_COLORS: Record<EventType, string> = {
  act: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  institutional: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  holiday: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  exam: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  meeting: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  report_delivery: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
}

export default function CalendarPage() {
  const { school } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)

  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const { data: events, isLoading, error } = useCalendarEvents(
    calStart.toISOString(),
    calEnd.toISOString()
  )

  const { data: scheduleData } = useQuery({
    queryKey: ["calendar-schedules", school?.id],
    queryFn: async () => {
      if (!school?.id) return {}
      const res = await fetch(`/api/employee-schedules?school_id=${school.id}`)
      const resp = await res.json()
      if (!res.ok) throw new Error(resp.error)
      return (resp.schedules ?? {}) as Record<string, Record<string, { time_start: string; time_end: string }[]>>
    },
    enabled: !!school?.id,
    staleTime: 60000,
  })

  const employeeSchedules = useMemo(() => {
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

  const { data: employeeProfiles } = useQuery({
    queryKey: ["calendar-employees"],
    queryFn: async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient()
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, role")
        .in("role", ["teacher", "preceptor", "secretary"])
      if (error) throw error
      return data ?? []
    },
    staleTime: 300000,
  })

  const profileMap = useMemo(() => {
    const map = new Map<string, { first_name: string; last_name: string; role: string }>()
    for (const p of employeeProfiles ?? []) {
      map.set(p.id, p)
    }
    return map
  }, [employeeProfiles])

  const schedulesByDay = useMemo(() => {
    const byDay = new Map<string, { name: string; time_start: string; time_end: string }[]>()
    for (const day of days) {
      const dayOfWeek = day.getDay()
      const key = format(day, "yyyy-MM-dd")
      const entries: { name: string; time_start: string; time_end: string }[] = []
      for (const [empId, dayMap] of employeeSchedules.entries()) {
        const slots = dayMap[dayOfWeek]
        if (slots && slots.length > 0) {
          const profile = profileMap.get(empId)
          const name = profile ? `${profile.last_name}, ${profile.first_name}` : empId.slice(0, 8)
          for (const slot of slots) {
            entries.push({ name, time_start: slot.time_start, time_end: slot.time_end })
          }
        }
      }
      entries.sort((a, b) => a.time_start.localeCompare(b.time_start))
      byDay.set(key, entries)
    }
    return byDay
  }, [days, employeeSchedules, profileMap])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, typeof events>()
    if (!events) return map
    for (const event of events) {
      const key = format(new Date(event.start_date), "yyyy-MM-dd")
      const existing = map.get(key) || []
      existing.push(event)
      map.set(key, existing)
    }
    return map
  }, [events])

  if (isLoading) return <LoadingScreen />

  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

  return (
    <div className="space-y-6">
      <PageHeader title="Calendario Escolar" description="Eventos y actividades del ciclo lectivo">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button><Plus className="size-4" /> Nuevo Evento</Button>} />
          <DialogContent className="sm:max-w-lg">
            <NewEventForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </PageHeader>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          Error al cargar eventos: {(error as Error).message}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <CardTitle className="text-base font-medium">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd")
              const dayEvents = eventsByDay.get(key) || []
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-24 border-b border-r p-1 transition-colors",
                    !isSameMonth(day, currentMonth) && "bg-muted/30 text-muted-foreground/50",
                    isToday(day) && "bg-primary/5"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs",
                      isToday(day) && "bg-primary text-primary-foreground font-medium"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <Dialog
                        key={event.id}
                        open={selectedEvent === event.id}
                        onOpenChange={(open) => setSelectedEvent(open ? event.id : null)}
                      >
                        <DialogTrigger render={
                          <button
                            type="button"
                            onClick={() => setSelectedEvent(event.id)}
                            className={cn(
                              "w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium leading-tight",
                              EVENT_COLORS[event.type as EventType] || ""
                            )}
                          >
                            {event.title}
                          </button>
                        } />
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{event.title}</DialogTitle>
                            <DialogDescription>
                              <Badge className={EVENT_COLORS[event.type as EventType]}>
                                {EVENT_TYPES.find((t) => t.value === event.type)?.label || event.type}
                              </Badge>
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3">
                            {event.description && (
                              <p className="text-sm">{event.description}</p>
                            )}
                            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
                              <p>
                                Inicio: {formatDateTime(event.start_date)}
                              </p>
                              {event.end_date && (
                                <p>Fin: {formatDateTime(event.end_date)}</p>
                              )}
                              <p>
                                {event.all_day
                                  ? "Todo el día"
                                  : "Horario específico"}
                              </p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="block px-1 text-[10px] text-muted-foreground">
                        +{dayEvents.length - 3} más
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Users className="size-4" />
            Horarios del Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b">
            {DAY_LABELS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd")
              const dayOfWeek = day.getDay()
              const shiftGroups = schedulesByDay.get(key)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-28 border-b border-r p-1",
                    !isCurrentMonth && "bg-muted/30"
                  )}
                >
                  <span className="inline-flex size-5 items-center justify-center rounded-full text-[10px] text-muted-foreground">
                    {format(day, "d")}
                  </span>
                  {isCurrentMonth && shiftGroups && shiftGroups.length > 0 && (
                    <div className="mt-0.5 space-y-0.5">
                      {shiftGroups.slice(0, 4).map((entry, i) => (
                        <div key={i} className="truncate rounded-[3px] px-1 py-[1px] text-[8px] leading-tight text-muted-foreground">
                          <span className="font-medium">{entry.time_start}</span>
                          {" "}
                          {entry.name.split(", ")[0]}
                        </div>
                      ))}
                      {shiftGroups.length > 4 && (
                        <span className="px-1 text-[8px] text-muted-foreground/60">
                          +{shiftGroups.length - 4} más
                        </span>
                      )}
                    </div>
                  )}
                  {isCurrentMonth && (!shiftGroups || shiftGroups.length === 0) && (
                    <p className="px-1 text-[9px] text-muted-foreground/40">—</p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function NewEventForm({ onSuccess }: { onSuccess: () => void }) {
  const createEvent = useCreateEvent()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<EventType | "">("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [allDay, setAllDay] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !type || !startDate) return
    await createEvent.mutateAsync({
      school_id: "",
      title,
      description: description || null,
      type: type as EventType,
      start_date: new Date(startDate).toISOString(),
      end_date: endDate ? new Date(endDate).toISOString() : null,
      all_day: allDay,
    })
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Nuevo Evento</DialogTitle>
        <DialogDescription>
          Complete los detalles del evento escolar.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="ev-title">Título</Label>
          <Input
            id="ev-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nombre del evento"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-type">Tipo</Label>
          <Select value={type} onValueChange={(v) => setType(v as EventType)}>
            <SelectTrigger id="ev-type">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-description">Descripción</Label>
          <Textarea
            id="ev-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ev-start">Fecha de inicio</Label>
            <Input
              id="ev-start"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-end">Fecha de fin</Label>
            <Input
              id="ev-end"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="ev-allday"
            checked={allDay}
            onCheckedChange={setAllDay}
          />
          <Label htmlFor="ev-allday">Todo el día</Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={createEvent.isPending || !title || !type || !startDate}>
          {createEvent.isPending ? "Guardando..." : "Crear Evento"}
        </Button>
      </DialogFooter>
    </form>
  )
}
