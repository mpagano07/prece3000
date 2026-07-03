"use client"

import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DAY_LABELS } from "@/lib/constants"

export interface ScheduleSlot {
  day_of_week: number
  time_start: string
  time_end: string
}

interface ScheduleEditorProps {
  slots: ScheduleSlot[]
  onChange: (slots: ScheduleSlot[]) => void
  compact?: boolean
}

export function ScheduleEditor({ slots, onChange, compact }: ScheduleEditorProps) {
  const updateSlot = (index: number, field: keyof ScheduleSlot, value: string | number) => {
    const next = slots.map((slot, i) =>
      i === index ? { ...slot, [field]: value } : slot
    )
    onChange(next)
  }

  const addSlot = () => {
    onChange([...slots, { day_of_week: 1, time_start: "08:00", time_end: "12:00" }])
  }

  const removeSlot = (index: number) => {
    onChange(slots.filter((_, i) => i !== index))
  }

  const timeClash = (i: number, j: number) => {
    if (i === j) return false
    const a = slots[i], b = slots[j]
    if (a.day_of_week !== b.day_of_week) return false
    return a.time_start < b.time_end && b.time_start < a.time_end
  }

  return (
    <div className={compact ? "" : "space-y-2"}>
      {slots.length > 0 && (
        <div className={compact ? "space-y-1" : "space-y-1.5"}>
          {slots.map((slot, i) => {
            const clash = slots.some((_, j) => timeClash(i, j))
            return (
              <div key={i} className={compact ? "flex items-center gap-1" : "flex items-end gap-2"}>
                <div className={compact ? "min-w-0 flex-1" : ""}>
                  {!compact && <Label className="text-[10px]">Día</Label>}
                  <Select
                    value={String(slot.day_of_week)}
                    onValueChange={(v) => updateSlot(i, "day_of_week", Number(v))}
                  >
                    <SelectTrigger className={cn("h-7 text-xs", compact ? "w-[52px]" : "w-full")}>
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
                <div className={compact ? "flex-1" : ""}>
                  {!compact && <Label className="text-[10px]">Desde</Label>}
                  <Input
                    type="time"
                    value={slot.time_start}
                    onChange={(e) => updateSlot(i, "time_start", e.target.value)}
                    className={cn("h-7 text-xs", compact ? "w-[72px]" : "w-full")}
                  />
                </div>
                <div className={compact ? "flex-1" : ""}>
                  {!compact && <Label className="text-[10px]">Hasta</Label>}
                  <Input
                    type="time"
                    value={slot.time_end}
                    onChange={(e) => updateSlot(i, "time_end", e.target.value)}
                    className={cn("h-7 text-xs", compact ? "w-[72px]" : "w-full")}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={cn("shrink-0", compact ? "size-6" : "size-7")}
                  onClick={() => removeSlot(i)}
                >
                  <X className={compact ? "size-3" : "size-3.5"} />
                </Button>
                {clash && (
                  <span className="text-[9px] text-destructive shrink-0">Superposición</span>
                )}
              </div>
            )
          })}
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={addSlot}
        className={cn("w-full", compact ? "h-6 text-[10px]" : "h-7 text-xs")}
      >
        <Plus className={compact ? "size-3" : "size-3.5"} />
        Agregar horario
      </Button>
    </div>
  )
}
