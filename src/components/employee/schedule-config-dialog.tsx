"use client"

import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, Calendar, BookOpen, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScheduleEditor, type ScheduleSlot } from "./schedule-editor"
import { DAY_LABELS } from "@/lib/constants"

interface ScheduleConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface DivisionScheduleInfo {
  day_of_week: number
  time_start: string
  time_end: string
  division_name: string
  subject_name: string
}

function defaultPreceptorSlots(): ScheduleSlot[] {
  return [
    { day_of_week: 1, time_start: "08:00", time_end: "12:00" },
    { day_of_week: 2, time_start: "08:00", time_end: "12:00" },
    { day_of_week: 3, time_start: "08:00", time_end: "12:00" },
    { day_of_week: 4, time_start: "08:00", time_end: "12:00" },
    { day_of_week: 5, time_start: "08:00", time_end: "12:00" },
  ]
}

function slotsEqual(a: ScheduleSlot[], b: ScheduleSlot[]) {
  if (a.length !== b.length) return false
  const sorted = (s: ScheduleSlot[]) =>
    [...s].sort((x, y) => x.day_of_week - y.day_of_week || x.time_start.localeCompare(y.time_start))
  const sa = sorted(a)
  const sb = sorted(b)
  return sa.every((s, i) =>
    s.day_of_week === sb[i].day_of_week &&
    s.time_start === sb[i].time_start &&
    s.time_end === sb[i].time_end
  )
}

export function ScheduleConfigDialog({ open, onOpenChange }: ScheduleConfigDialogProps) {
  const { school } = useAuth()
  const queryClient = useQueryClient()
  const [scheduleMap, setScheduleMap] = useState<Record<string, ScheduleSlot[]>>({})
  const [savedMap, setSavedMap] = useState<Record<string, ScheduleSlot[]>>({})
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ["employees", school?.id],
    queryFn: async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient()
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("school_id", school!.id)
        .in("role", ["teacher", "preceptor", "secretary"])
        .order("role")
        .order("last_name")
      if (error) throw error
      return data ?? []
    },
    enabled: !!school?.id && open,
  })

  const { data: existingSchedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ["employee-schedules-config", school?.id],
    queryFn: async () => {
      const res = await fetch(`/api/employee-schedules?school_id=${school!.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const map: Record<string, ScheduleSlot[]> = {}
      for (const [empId, days] of Object.entries(data.schedules ?? {}) as [string, Record<string, { time_start: string; time_end: string }[]>][]) {
        const slots: ScheduleSlot[] = []
        for (const [dayStr, timeSlots] of Object.entries(days)) {
          for (const ts of timeSlots) {
            slots.push({ day_of_week: Number(dayStr), time_start: ts.time_start, time_end: ts.time_end })
          }
        }
        slots.sort((a, b) => a.day_of_week - b.day_of_week || a.time_start.localeCompare(b.time_start))
        map[empId] = slots
      }
      return map
    },
    enabled: !!school?.id && open,
  })

  const { data: divisionSchedules, isLoading: divisionLoading } = useQuery({
    queryKey: ["division-schedules-for-employees", school?.id],
    queryFn: async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient()
      const { data, error } = await supabase
        .from("division_schedules")
        .select(`
          teacher_id,
          day_of_week,
          time_start,
          time_end,
          division:divisions!inner(name),
          subject:subjects!inner(name)
        `)
        .eq("school_id", school!.id)
      if (error) throw error
      const map: Record<string, DivisionScheduleInfo[]> = {}
      for (const s of data ?? []) {
        const teacherId = s.teacher_id
        if (!map[teacherId]) map[teacherId] = []
        const division = Array.isArray(s.division) ? s.division[0] : s.division
        const subject = Array.isArray(s.subject) ? s.subject[0] : s.subject
        map[teacherId].push({
          day_of_week: s.day_of_week,
          time_start: s.time_start.slice(0, 5),
          time_end: s.time_end.slice(0, 5),
          division_name: (division as { name: string }).name,
          subject_name: (subject as { name: string }).name,
        })
      }
      return map
    },
    enabled: !!school?.id && open,
  })

  useEffect(() => {
    if (!employees || !existingSchedules || !divisionSchedules) return
    const next: Record<string, ScheduleSlot[]> = {}
    for (const emp of employees) {
      const seenDays = new Set<number>()
      const merged: ScheduleSlot[] = []

      for (const slot of existingSchedules[emp.id] ?? []) {
        merged.push(slot)
        seenDays.add(slot.day_of_week)
      }

      for (const ds of divisionSchedules[emp.id] ?? []) {
        if (!seenDays.has(ds.day_of_week)) {
          merged.push({ day_of_week: ds.day_of_week, time_start: ds.time_start, time_end: ds.time_end })
          seenDays.add(ds.day_of_week)
        }
      }

      if (merged.length > 0) {
        merged.sort((a, b) => a.day_of_week - b.day_of_week || a.time_start.localeCompare(b.time_start))
        next[emp.id] = merged
      } else if (emp.role === "secretary" || emp.role === "preceptor") {
        next[emp.id] = defaultPreceptorSlots()
      } else {
        next[emp.id] = []
      }
    }
    setScheduleMap(next)
    setSavedMap(structuredClone(next))
  }, [employees, existingSchedules, divisionSchedules])

  const updateEmployeeSlots = useCallback((employeeId: string, slots: ScheduleSlot[]) => {
    setScheduleMap((prev) => ({ ...prev, [employeeId]: slots }))
  }, [])

  const isDirty = useCallback((empId: string) => {
    return !slotsEqual(scheduleMap[empId] ?? [], savedMap[empId] ?? [])
  }, [scheduleMap, savedMap])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const saveOneMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const slots = scheduleMap[employeeId]
      if (!slots || slots.length === 0) {
        const res = await fetch("/api/employee-schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            school_id: school!.id,
            schedules: { [employeeId]: {} },
            employee_id: employeeId,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        return data
      }
      const days: Record<string, { time_start: string; time_end: string }[]> = {}
      for (const slot of slots) {
        const key = String(slot.day_of_week)
        if (!days[key]) days[key] = []
        days[key].push({ time_start: slot.time_start, time_end: slot.time_end })
      }
      const res = await fetch("/api/employee-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_id: school!.id,
          schedules: { [employeeId]: days },
          employee_id: employeeId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: (_data, employeeId) => {
      toast.success("Horario guardado")
      setSavedMap((prev) => ({ ...prev, [employeeId]: structuredClone(scheduleMap[employeeId] ?? []) }))
      queryClient.invalidateQueries({ queryKey: ["employee-schedules"] })
      queryClient.invalidateQueries({ queryKey: ["employee-schedules-config"] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al guardar horario")
    },
  })

  const revertEmployee = useCallback((employeeId: string) => {
    setScheduleMap((prev) => ({ ...prev, [employeeId]: structuredClone(savedMap[employeeId] ?? []) }))
  }, [savedMap])

  const loading = employeesLoading || schedulesLoading || divisionLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="size-4" />
            Configurar horarios del personal
          </DialogTitle>
          <DialogDescription>
            Hacé clic en un empleado para ver y editar sus horarios. Cada persona se guarda por separado.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : !employees || employees.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No hay personal registrado en esta institución.
          </p>
        ) : (
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-2 pr-3">
              {employees.map((emp) => {
                const slots = scheduleMap[emp.id] ?? []
                const divSlots = divisionSchedules?.[emp.id] ?? []
                const roleLabel =
                  emp.role === "teacher"
                    ? "Docente"
                    : emp.role === "preceptor"
                      ? "Preceptor"
                      : "Secretario"
                const dirty = isDirty(emp.id)
                const saving = saveOneMutation.isPending && saveOneMutation.variables === emp.id
                const expanded = expandedIds.has(emp.id)

                return (
                  <div
                    key={emp.id}
                    className={cn("rounded-lg border", expanded && "border-primary/40")}
                  >
                    <div
                      className="flex items-center justify-between gap-2 p-3 cursor-pointer select-none"
                      onClick={() => toggleExpand(emp.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="size-7 shrink-0">
                          <AvatarFallback className="text-[10px]">
                            {emp.first_name?.charAt(0) ?? "?"}
                            {emp.last_name?.charAt(0) ?? ""}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate leading-tight">
                            {emp.last_name}, {emp.first_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {dirty && (
                          <span className="size-1.5 rounded-full bg-amber-500" />
                        )}
                        <ChevronDown
                          className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")}
                        />
                      </div>
                    </div>

                    {expanded && (
                      <div className="px-3 pb-3 border-t pt-2 space-y-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {dirty && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => revertEmployee(emp.id)}
                              disabled={saving}
                            >
                              Descartar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => saveOneMutation.mutate(emp.id)}
                            disabled={!dirty || saving}
                          >
                            {saving ? (
                              <Loader2 className="size-3 animate-spin mr-1" />
                            ) : null}
                            Guardar
                          </Button>
                        </div>

                        {divSlots.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {divSlots.map((ds, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                                <BookOpen className="size-2.5" />
                                {DAY_LABELS[ds.day_of_week]} {ds.time_start}-{ds.time_end}
                                <span className="text-muted-foreground">|</span>
                                {ds.division_name} - {ds.subject_name}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <ScheduleEditor
                          slots={slots}
                          onChange={(s) => updateEmployeeSlots(emp.id, s)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
