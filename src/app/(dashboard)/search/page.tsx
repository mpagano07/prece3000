"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import { useStudentSearch } from "@/hooks/use-students"
import { getInitials } from "@/lib/utils"

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const { data: results, isLoading } = useStudentSearch(query)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Buscar
        </h1>
        <p className="text-sm text-muted-foreground">
          Buscá estudiantes por nombre, apellido o DNI
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Escribí para buscar..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 pl-10 pr-10 text-base"
          autoFocus
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {!query && (
        <EmptyState
          icon={<Search className="size-12" />}
          title="Escribí para buscar..."
          description="Ingresá el nombre, apellido o DNI de un estudiante"
        />
      )}

      {query && isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border p-3 animate-pulse"
            >
              <div className="size-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="h-3 w-1/3 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      )}

      {query && !isLoading && results && results.length === 0 && (
        <EmptyState
          icon={<Users className="size-12" />}
          title="Sin resultados"
          description={`No se encontraron estudiantes que coincidan con "${query}"`}
        />
      )}

      {results && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {results.length} resultado{results.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-2">
            {results.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => router.push(`/students/${student.id}`)}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/50"
              >
                <Avatar>
                  <AvatarFallback>
                    {getInitials(student.first_name, student.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {student.first_name} {student.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    DNI: {student.dni}
                    {(student as any).divisions && (
                      <>
                        {" "}
                        ·{" "}
                        {(student as any).divisions?.name}{" "}
                        {(student as any).divisions?.courses?.name && (
                          <>- {(student as any).divisions.courses.name}</>
                        )}
                      </>
                    )}
                  </p>
                </div>
                <Badge
                  variant={
                    student.status === "active" ? "default" : "secondary"
                  }
                >
                  {student.status === "active" ? "Activo" : "Inactivo"}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
