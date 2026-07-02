"use client"

import { useState } from "react"
import { Calendar, Plus, Check, X, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { useAuth } from "@/contexts/auth-context"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { AcademicYear } from "@/types/database"

export default function AdminAcademicYearsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: schools } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("schools")
        .select("id, name")
        .order("name")
      if (error) throw error
      return data ?? []
    },
  })

  const { data: academicYears, isLoading } = useQuery({
    queryKey: ["admin-academic-years"],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("academic_years")
        .select("*, schools(name)")
        .order("created_at", { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: profile?.role === "super_admin",
  })

  const [newAY, setNewAY] = useState({
    school_id: "",
    name: "",
    start_date: "",
    end_date: "",
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAY),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success("Año académico creado")
      setIsCreateOpen(false)
      setNewAY({ school_id: "", name: "", start_date: "", end_date: "" })
      queryClient.invalidateQueries({ queryKey: ["admin-academic-years"] })
      queryClient.invalidateQueries({ queryKey: ["activeAcademicYear"] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al crear")
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch("/api/academic-years", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success("Año académico actualizado")
      queryClient.invalidateQueries({ queryKey: ["admin-academic-years"] })
      queryClient.invalidateQueries({ queryKey: ["activeAcademicYear"] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al actualizar")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/academic-years", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success("Año académico eliminado")
      setDeleteId(null)
      queryClient.invalidateQueries({ queryKey: ["admin-academic-years"] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al eliminar")
    },
  })

  if (profile?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Calendar className="size-12 text-muted-foreground/50" />
        <h3 className="text-sm font-medium">Acceso restringido</h3>
        <p className="text-sm text-muted-foreground">
          Solo el Super Administrador puede gestionar años académicos.
        </p>
      </div>
    )
  }

  if (isLoading) return <LoadingScreen />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Años Académicos"
        description="Gestioná los años lectivos de las instituciones"
      >
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={
            <Button>
              <Plus /> Nuevo Año Académico
            </Button>
          } />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Año Académico</DialogTitle>
              <DialogDescription>
                Creá un nuevo período lectivo para una institución.
                Se activará automáticamente si no hay otro activo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Institución</Label>
                <Select
                  value={newAY.school_id}
                  onValueChange={(v) => setNewAY({ ...newAY, school_id: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar institución" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  placeholder="Ej: Ciclo Lectivo 2026"
                  value={newAY.name}
                  onChange={(e) => setNewAY({ ...newAY, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Fecha inicio</Label>
                  <Input
                    type="date"
                    value={newAY.start_date}
                    onChange={(e) => setNewAY({ ...newAY, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha fin</Label>
                  <Input
                    type="date"
                    value={newAY.end_date}
                    onChange={(e) => setNewAY({ ...newAY, end_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !newAY.school_id || !newAY.name || !newAY.start_date || !newAY.end_date}
              >
                {createMutation.isPending ? "Creando..." : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {!academicYears || academicYears.length === 0 ? (
        <EmptyState
          icon={<Calendar className="size-12" />}
          title="Sin años académicos"
          description="No hay períodos lectivos registrados. Cree uno para poder gestionar cursos."
          action={{ label: "Nuevo Año Académico", onClick: () => setIsCreateOpen(true) }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {academicYears.map((ay) => (
            <Card key={ay.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-sm">{ay.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {ay.schools?.name ?? "Escuela desconocida"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={ay.active ? "default" : "secondary"}>
                    {ay.active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                  <p>Inicio: {ay.start_date}</p>
                  <p>Fin: {ay.end_date}</p>
                </div>
                <div className="flex gap-2">
                  {!ay.active && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        toggleActiveMutation.mutate({ id: ay.id, active: true })
                      }
                      disabled={toggleActiveMutation.isPending}
                    >
                      <Check /> Activar
                    </Button>
                  )}
                  {ay.active && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        toggleActiveMutation.mutate({ id: ay.id, active: false })
                      }
                      disabled={toggleActiveMutation.isPending}
                    >
                      <X /> Desactivar
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive"
                    onClick={() => setDeleteId(ay.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 /> Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Eliminar año académico"
        description="¿Está seguro de eliminar este año académico? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  )
}
