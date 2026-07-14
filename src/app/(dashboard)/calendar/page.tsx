"use client"

import { useState, useMemo } from "react"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
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
import { useCalendarEvents, useCreateEvent } from "@/hooks/use-calendar"
import { EVENT_TYPES } from "@/lib/constants"
import { formatDateTime } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { EventType, CalendarEvent } from "@/types/database"

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

  const eventsByDay = useMemo(() => {
    const map = new Map<string, typeof events>()
    if (!events) return map
    for (const event of events) {
      const key = format(new Date(event.startDate), "yyyy-MM-dd")
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
                    {dayEvents.slice(0, 3).map((event: CalendarEvent) => (
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
                                Inicio: {formatDateTime(event.startDate)}
                              </p>
                              {event.endDate && (
                                <p>Fin: {formatDateTime(event.endDate)}</p>
                              )}
                              <p>
                                {event.allDay
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
      schoolId: "",
      title,
      description: description || null,
      type: type as EventType,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      allDay: allDay,
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
