"use client"

import { useState, useMemo } from "react"
import {
  BookOpen,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { useBookEntries, useCreateBookEntry } from "@/hooks/use-book"
import { useStudentSearch } from "@/hooks/use-students"
import { BOOK_ENTRY_TYPES } from "@/lib/constants"
import { formatDateTime, formatDate } from "@/lib/utils"
import type { BookEntryType } from "@/types/database"

const BOOK_TYPE_COLORS: Record<BookEntryType, string> = {
  incident: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  sanction: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  phone_call: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  interview: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  meeting: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  observation: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  conduct_followup: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
}

const PAGE_SIZE = 20

export default function BookPage() {
  const [filters, setFilters] = useState<{
    type?: BookEntryType
    search: string
    startDate?: string
    endDate?: string
  }>({ search: "" })
  const [page, setPage] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<number | null>(null)

  const { data: entries, isLoading, error } = useBookEntries(
    filters.type || filters.startDate || filters.endDate
      ? {
          type: filters.type,
          startDate: filters.startDate,
          endDate: filters.endDate,
        }
      : undefined
  )

  const filtered = useMemo(() => {
    if (!entries) return []
    let result = entries
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
      )
    }
    return result
  }, [entries, filters.search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (isLoading) return <LoadingScreen />
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <p className="text-destructive">Error al cargar el libro digital</p>
        <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Libro Digital del Preceptor" description="Registro de novedades y ocurrencias">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button><Plus className="size-4" /> Nuevo Registro</Button>} />
          <DialogContent className="sm:max-w-lg">
            <NewEntryForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por título o descripción..."
            value={filters.search}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, search: e.target.value }))
              setPage(1)
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={filters.type || "all"}
          onValueChange={(v) => {
            const val = v ?? ""
            setFilters((prev) => ({
              ...prev,
              type: val === "all" ? undefined : (val as BookEntryType),
            }))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {BOOK_ENTRY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filters.startDate || ""}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, startDate: e.target.value }))
            setPage(1)
          }}
          className="w-full sm:w-40"
          placeholder="Desde"
        />
        <Input
          type="date"
          value={filters.endDate || ""}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, endDate: e.target.value }))
            setPage(1)
          }}
          className="w-full sm:w-40"
          placeholder="Hasta"
        />
      </div>

      {paginated.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-12" />}
          title="Sin registros"
          description={filters.search ? "No se encontraron registros con los filtros aplicados" : "No hay registros en el libro digital"}
          action={!filters.search ? { label: "Nuevo Registro", onClick: () => setIsCreateOpen(true) } : undefined}
        />
      ) : (
        <>
          <div className="grid gap-3">
            {paginated.map((entry, idx) => (
              <Dialog
                key={entry.id}
                open={selectedEntry === idx}
                onOpenChange={(open) => setSelectedEntry(open ? idx : null)}
              >
                <DialogTrigger>
                  <Card
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => setSelectedEntry(idx)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <CardTitle className="text-sm">{entry.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {entry.description}
                          </CardDescription>
                        </div>
                        <Badge
                          className={
                            BOOK_TYPE_COLORS[entry.type as BookEntryType] ||
                            ""
                          }
                        >
                          {BOOK_ENTRY_TYPES.find(
                            (t) => t.value === entry.type
                          )?.label || entry.type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {(entry as any).students
                            ? `${(entry as any).students.first_name} ${(entry as any).students.last_name}`
                            : "Sin estudiante"}
                        </span>
                        <span>{formatDateTime(entry.created_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{entry.title}</DialogTitle>
                    <DialogDescription>
                      <Badge
                        className={
                          BOOK_TYPE_COLORS[entry.type as BookEntryType] || ""
                        }
                      >
                        {BOOK_ENTRY_TYPES.find(
                          (t) => t.value === entry.type
                        )?.label || entry.type}
                      </Badge>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed">{entry.description}</p>
                    <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
                      <p>
                        Estudiante:{" "}
                        {(entry as any).students
                          ? `${(entry as any).students.first_name} ${(entry as any).students.last_name}`
                          : "No vinculado"}
                      </p>
                      <p>Creado: {formatDateTime(entry.created_at)}</p>
                      <p>
                        Fecha: {formatDate(entry.created_at)}
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Página {page} de {totalPages} ({filtered.length} registros)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function NewEntryForm({ onSuccess }: { onSuccess: () => void }) {
  const createEntry = useCreateBookEntry()
  const [type, setType] = useState<BookEntryType | "">("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [studentSearch, setStudentSearch] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])

  const { data: students } = useStudentSearch(studentSearch)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!type || !title || !description) return
    await createEntry.mutateAsync({
      school_id: "",
      type: type as BookEntryType,
      title,
      description,
      student_id: selectedStudentId,
    })
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Nuevo Registro</DialogTitle>
        <DialogDescription>
          Complete los campos para crear un nuevo registro en el libro digital.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo</Label>
          <Select value={type} onValueChange={(v) => setType(v as BookEntryType)}>
            <SelectTrigger id="type">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {BOOK_ENTRY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título del registro"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describa la novedad u ocurrencia..."
            rows={4}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Fecha</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="studentSearch">Estudiante (opcional)</Label>
          <Input
            id="studentSearch"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Buscar estudiante..."
          />
          {selectedStudentId && (
            <p className="text-xs text-muted-foreground">
              Estudiante seleccionado:{" "}
              {students?.find((s) => s.id === selectedStudentId)
                ? `${students.find((s) => s.id === selectedStudentId)!.first_name} ${students.find((s) => s.id === selectedStudentId)!.last_name}`
                : "Cargando..."}
            </p>
          )}
          {students && students.length > 0 && !selectedStudentId && (
            <div className="max-h-32 overflow-y-auto rounded-lg border">
              {students.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                  onClick={() => {
                    setSelectedStudentId(s.id)
                    setStudentSearch(`${s.first_name} ${s.last_name}`)
                  }}
                >
                  {s.first_name} {s.last_name} - {s.dni}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={createEntry.isPending || !type || !title || !description}>
          {createEntry.isPending ? "Guardando..." : "Guardar Registro"}
        </Button>
      </DialogFooter>
    </form>
  )
}
