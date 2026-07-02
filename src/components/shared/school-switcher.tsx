"use client"

import { Building2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function SchoolSwitcher() {
  const { school, availableSchools, setActiveSchool } = useAuth()

  if (availableSchools.length <= 1) return null

  return (
    <Select
      value={school?.id ?? null}
      onValueChange={(v) => {
        const s = availableSchools.find((s) => s.id === v)
        if (s) setActiveSchool(s)
      }}
      getLabel={(v) => {
        const s = availableSchools.find((s) => s.id === v)
        return s?.name ?? "Seleccionar escuela"
      }}
    >
      <SelectTrigger className="max-w-48 border-transparent bg-transparent hover:bg-accent/50">
        <Building2 className="size-4 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="Escuela" />
      </SelectTrigger>
      <SelectContent>
        {availableSchools.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
