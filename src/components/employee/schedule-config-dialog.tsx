"use client"

import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, Calendar } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScheduleEditor, type ScheduleSlot } from "./schedule-editor"

interface ScheduleConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ScheduleConfigDialog({ open, onOpenChange }: ScheduleConfigDialogProps) {
  const { school } = useAuth()
  const queryClient = useQueryClient()
  const [scheduleMap, setScheduleMap] = useState<Record<string, ScheduleSlot[]>>({})

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

  useEffect(() => {
    if (employees && existingSchedules) {
      setScheduleMap((prev) => {
        const next: Record<string, ScheduleSlot[]> = {}
        for (const emp of employees) {
          if (existingSchedules[emp.id]) {
            next[emp.id] = existingSchedules[emp.id]
          } else {
            const isPreceptorOrSec = emp.role === "secretary" || emp.role === "preceptor"
            next[emp.id] = isPreceptorOrSec
              ? [
                  { day_of_week: 1, time_start: "08:00", time_end: "12:00" },
                  { day_of_week: 2, time_start: "08:00", time_end: "12:00" },
                  { day_of_week: 3, time_start: "08:00", time_end: "12:00" },
                  { day_of_week: 4, time_start: "08:00", time_end: "12:00" },
                  { day_of_week: 5, time_start: "08:00", time_end: "12:00" },
                ]
              : []
          }
        }
        return next
      })
    } else if (employees && !existingSchedules) {
      setScheduleMap((prev) => {
        const next: Record<string, ScheduleSlot[]> = {}
        for (const emp of employees) {
          const isPreceptorOrSec = emp.role === "secretary" || emp.role === "preceptor"
          next[emp.id] = isPreceptorOrSec
            ? [
                { day_of_week: 1, time_start: "08:00", time_end: "12:00" },
                { day_of_week: 2, time_start: "08:00", time_end: "12:00" },
                { day_of_week: 3, time_start: "08:00", time_end: "12:00" },
                { day_of_week: 4, time_start: "08:00", time_end: "12:00" },
                { day_of_week: 5, time_start: "08:00", time_end: "12:00" },
              ]
            : []
        }
        return next
      })
    }
  }, [employees, existingSchedules])

  const updateEmployeeSlots = useCallback((employeeId: string, slots: ScheduleSlot[]) => {
    setScheduleMap((prev) => ({ ...prev, [employeeId]: slots }))
  }, [])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, Record<string, { time_start: string; time_end: string }[]>> = {}
      for (const [empId, slots] of Object.entries(scheduleMap)) {
        if (slots.length === 0) continue
        const days: Record<string, { time_start: string; time_end: string }[]> = {}
        for (const slot of slots) {
          const key = String(slot.day_of_week)
          if (!days[key]) days[key] = []
          days[key].push({ time_start: slot.time_start, time_end: slot.time_end })
        }
        payload[empId] = days
      }
      const res = await fetch("/api/employee-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school_id: school!.id, schedules: payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success("Horarios guardados correctamente")
      queryClient.invalidateQueries({ queryKey: ["employee-schedules"] })
      queryClient.invalidateQueries({ queryKey: ["employee-schedules-config"] })
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al guardar horarios")
    },
  })

  const loading = employeesLoading || schedulesLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="size-4" />
            Configurar horarios del personal
          </DialogTitle>
          <DialogDescription>
            Asigná los días y horarios de cada empleado. Agregá todos los bloques horarios que necesites.
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
          <ScrollArea className="max-h-[65vh]">
            <div className="space-y-4 pr-3">
              {employees.map((emp) => {
                const slots = scheduleMap[emp.id] ?? []
                const roleLabel =
                  emp.role === "teacher"
                    ? "Docente"
                    : emp.role === "preceptor"
                      ? "Preceptor"
                      : "Secretario"
                return (
                  <div
                    key={emp.id}
                    className="rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="size-7">
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
                    <ScheduleEditor
                      slots={slots}
                      onChange={(s) => updateEmployeeSlots(emp.id, s)}
                    />
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter showCloseButton>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || loading}
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            Guardar horarios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
