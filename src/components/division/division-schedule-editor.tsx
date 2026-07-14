"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Plus,
  X,
  Loader2,
  Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { DAY_LABELS } from "@/lib/constants"
import { createSubject } from "@/services/courses"
import type { Subject, Profile } from "@/types/database"

interface ScheduleEntry {
  id?: string
  dayOfWeek: number
  timeStart: string
  timeEnd: string
  subjectId: string
  teacherId: string
}

interface DivisionScheduleEditorProps {
  divisionId: string
  schoolId: string
  academicYearId: string
  subjects: Subject[]
  teachers: Profile[]
  onSubjectsChange?: () => void
}

export function DivisionScheduleEditor({
  divisionId,
  schoolId,
  academicYearId,
  subjects,
  teachers,
  onSubjectsChange,
}: DivisionScheduleEditorProps) {
  const queryClient = useQueryClient()
  const [editEntry, setEditEntry] = useState<{
    index: number
    entry: ScheduleEntry
  } | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["division-schedules", divisionId],
    queryFn: async () => {
      const res = await fetch(`/api/division-schedules?division_id=${divisionId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return (data.schedules ?? []) as (ScheduleEntry & {
        subject?: { name: string }
        teacher?: { firstName: string; lastName: string }
      })[]
    },
    enabled: !!divisionId,
  })

  const saveMutation = useMutation({
    mutationFn: async (entries: ScheduleEntry[]) => {
      const schedules = entries.map((e) => ({
        dayOfWeek: e.dayOfWeek,
        timeStart: e.timeStart,
        timeEnd: e.timeEnd,
        subjectId: e.subjectId,
        teacherId: e.teacherId,
      }))
      const res = await fetch("/api/division-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ division_id: divisionId, schoolId: schoolId, schedules }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success("Horario guardado")
      queryClient.invalidateQueries({ queryKey: ["division-schedules", divisionId] })
      queryClient.invalidateQueries({ queryKey: ["division-schedules-by-teacher"] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al guardar horario")
    },
  })

  const groupedSchedules = useMemo(() => {
    if (!schedules) return new Map<number, typeof schedules>()
    const map = new Map<number, typeof schedules>()
    for (const s of schedules) {
      const existing = map.get(s.dayOfWeek) ?? []
      existing.push(s)
      map.set(s.dayOfWeek, existing)
    }
    for (const [, entries] of map) {
      entries.sort((a, b) => a.timeStart.localeCompare(b.timeStart))
    }
    return map
  }, [schedules])

  const allTimeStarts = useMemo(() => {
    if (!schedules) return []
    const set = new Set<string>()
    for (const s of schedules) {
      set.add(s.timeStart.slice(0, 5))
    }
    return Array.from(set).sort()
  }, [schedules])

  const activeDays = useMemo(() => {
    if (!schedules) return []
    const set = new Set<number>()
    for (const s of schedules) {
      set.add(s.dayOfWeek)
    }
    return Array.from(set).sort()
  }, [schedules])

  const workingDays = activeDays.length > 0 ? activeDays : [1, 2, 3, 4, 5]

  const getScheduleAt = (day: number, timeStart: string) => {
    const entries = groupedSchedules.get(day)
    if (!entries) return null
    return entries.find((s) => s.timeStart.slice(0, 5) === timeStart) ?? null
  }

  const handleSave = (entry: ScheduleEntry, index: number | null) => {
    const current = schedules ?? []
    let next: ScheduleEntry[]
    if (index !== null) {
      next = current.map((s, i) => (i === index ? { ...entry, id: s.id } : s))
    } else {
      next = [...current, entry]
    }
    saveMutation.mutate(next)
    setEditEntry(null)
    setShowAdd(false)
  }

  const handleRemove = (index: number) => {
    const next = (schedules ?? []).filter((_, i) => i !== index)
    saveMutation.mutate(next)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border bg-muted/50 px-2 py-1.5 text-left text-[10px] font-medium text-muted-foreground w-16">
                Horario
              </th>
              {workingDays.map((day) => (
                <th
                  key={day}
                  className="border bg-muted/50 px-2 py-1.5 text-center text-[10px] font-medium text-muted-foreground min-w-[100px]"
                >
                  {DAY_LABELS[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allTimeStarts.length === 0 ? (
              <tr>
                <td
                  colSpan={workingDays.length + 1}
                  className="border px-2 py-6 text-center text-[10px] text-muted-foreground"
                >
                  Sin horarios. Agregue el primer bloque.
                </td>
              </tr>
            ) : (
              allTimeStarts.map((ts) => (
                <tr key={ts}>
                  <td className="border px-1.5 py-1 text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                    {ts}
                  </td>
                  {workingDays.map((day) => {
                    const entry = getScheduleAt(day, ts)
                    return (
                      <td
                        key={day}
                        className={cn(
                          "border px-1 py-1 align-top",
                          entry ? "cursor-pointer" : "cursor-pointer"
                        )}
                        onClick={() => {
                          if (entry) {
                            const idx = schedules?.findIndex(
                              (s) => s.id === entry.id
                            ) ?? -1
                            setEditEntry({
                              index: idx,
                              entry: {
                                id: entry.id,
                                dayOfWeek: day,
                                timeStart: ts,
                                timeEnd: entry.timeEnd.slice(0, 5),
                                subjectId: entry.subjectId,
                                teacherId: entry.teacherId,
                              },
                            })
                          } else {
                            setEditEntry({
                              index: -1,
                              entry: {
                                dayOfWeek: day,
                                timeStart: ts,
                                timeEnd: ts,
                                subjectId: "",
                                teacherId: "",
                              },
                            })
                          }
                        }}
                      >
                        {entry ? (
                          <div className="group relative">
                            <p className="text-[10px] font-medium leading-tight">
                              {entry.subject?.name ?? "—"}
                            </p>
                            <p className="text-[9px] text-muted-foreground leading-tight">
                              {entry.teacher
                                ? `${entry.teacher.lastName}, ${entry.teacher.firstName}`
                                : "—"}
                            </p>
                            <p className="text-[8px] text-muted-foreground/60 leading-tight">
                              {entry.timeEnd.slice(0, 5)}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="size-3 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full h-7 text-xs"
        onClick={() => setShowAdd(true)}
      >
        <Plus className="size-3" />
        Agregar bloque horario
      </Button>

      <ScheduleEntryDialog
        open={editEntry !== null || showAdd}
        onOpenChange={(open) => {
          if (!open) {
            setEditEntry(null)
            setShowAdd(false)
          }
        }}
        entry={editEntry?.entry ?? null}
        subjects={subjects}
        teachers={teachers}
        schoolId={schoolId}
        academicYearId={academicYearId}
        onSubjectsChange={onSubjectsChange}
        onSave={(entry) => {
          if (editEntry && editEntry.index >= 0) {
            handleSave(entry, editEntry.index)
          } else {
            handleSave(entry, null)
          }
        }}
        onDelete={
          editEntry && editEntry.index >= 0
            ? () => handleRemove(editEntry.index)
            : undefined
        }
        saving={saveMutation.isPending}
      />
    </div>
  )
}

function ScheduleEntryDialog({
  open,
  onOpenChange,
  entry,
  subjects,
  teachers,
  schoolId,
  academicYearId,
  onSubjectsChange,
  onSave,
  onDelete,
  saving,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: ScheduleEntry | null
  subjects: Subject[]
  teachers: Profile[]
  schoolId: string
  academicYearId: string
  onSubjectsChange?: () => void
  onSave: (entry: ScheduleEntry) => void
  onDelete?: () => void
  saving: boolean
}) {
  const [dayOfWeek, setDayOfWeek] = useState(entry?.dayOfWeek ?? 1)
  const [timeStart, setTimeStart] = useState(entry?.timeStart ?? "08:00")
  const [timeEnd, setTimeEnd] = useState(entry?.timeEnd ?? "09:00")
  const [subjectId, setSubjectId] = useState(entry?.subjectId ?? "")
  const [teacherId, setTeacherId] = useState(entry?.teacherId ?? "")
  const [showNewSubject, setShowNewSubject] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState("")
  const [creatingSubject, setCreatingSubject] = useState(false)

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return
    setCreatingSubject(true)
    try {
      const data = await createSubject({ schoolId: schoolId, academicYearId: academicYearId, name: newSubjectName.trim() })
      setSubjectId(data.id)
      setNewSubjectName("")
      setShowNewSubject(false)
      onSubjectsChange?.()
      toast.success("Materia creada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear materia")
    } finally {
      setCreatingSubject(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {entry ? "Editar bloque horario" : "Nuevo bloque horario"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Día</Label>
            <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_LABELS.map((label, d) => (
                  <SelectItem key={d} value={String(d)} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Desde</Label>
              <Input
                type="time"
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hasta</Label>
              <Input
                type="time"
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Materia</Label>
            {showNewSubject ? (
              <div className="flex items-center gap-1.5">
                <Input
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="Nombre de la materia"
                  className="h-8 text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateSubject()
                  }}
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleCreateSubject}
                  disabled={creatingSubject || !newSubjectName.trim()}
                >
                  {creatingSubject ? <Loader2 className="size-3 animate-spin" /> : "Crear"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-8 w-8 shrink-0"
                  onClick={() => { setShowNewSubject(false); setNewSubjectName("") }}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Seleccionar materia" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.length === 0 && (
                      <div className="px-2 py-3 text-center text-[11px] text-muted-foreground">
                        No hay materias. Cree una nueva.
                      </div>
                    )}
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setShowNewSubject(true)}
                  title="Nueva materia"
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Docente</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Seleccionar docente" />
              </SelectTrigger>
              <SelectContent>
                {teachers.length === 0 && (
                  <div className="px-2 py-3 text-center text-[11px] text-muted-foreground">
                    No hay docentes registrados en la institución.
                  </div>
                )}
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.lastName}, {t.firstName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={saving}
            >
              <X className="size-3" />
              Eliminar
            </Button>
          )}
          <Button
            size="sm"
            onClick={() =>
              onSave({
                dayOfWeek: dayOfWeek,
                timeStart: timeStart,
                timeEnd: timeEnd,
                subjectId: subjectId,
                teacherId: teacherId,
              })
            }
            disabled={saving || !subjectId || !teacherId}
          >
            {saving ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              "Guardar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
