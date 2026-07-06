"use client"

import { useState } from "react"
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Users,
  BookOpen,
  GraduationCap,
  Layers,
  School as SchoolIcon,
  Calendar,
  Check,
  X,
} from "lucide-react"
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { useAuth } from "@/contexts/auth-context"
import { SchoolService } from "@/services/schools"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { School } from "@/types/database"

function useSchools() {
  return useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const supabase = createClient()
      return SchoolService.getAll(supabase)
    },
  })
}

export default function AdminSchoolsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: schools, isLoading, error } = useSchools()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editSchool, setEditSchool] = useState<School | null>(null)
  const [deleteSchoolId, setDeleteSchoolId] = useState<string | null>(null)
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null)
  const [stats, setStats] = useState<Record<string, any>>({})
  const [isAcademicYearsOpen, setIsAcademicYearsOpen] = useState(false)

  if (profile?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Building2 className="size-12 text-muted-foreground/50" />
        <h3 className="text-sm font-medium">Acceso restringido</h3>
        <p className="text-sm text-muted-foreground">
          Solo los super administradores pueden gestionar escuelas.
        </p>
      </div>
    )
  }

  if (isLoading) return <LoadingScreen />
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <p className="text-destructive">Error al cargar escuelas</p>
        <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
      </div>
    )
  }

  const handleShowStats = async (schoolId: string) => {
    if (expandedSchool === schoolId) {
      setExpandedSchool(null)
      return
    }
    try {
      const supabase = createClient()
      const schoolStats = await SchoolService.getStats(supabase, schoolId)
      setStats((prev) => ({ ...prev, [schoolId]: schoolStats }))
      setExpandedSchool(schoolId)
    } catch (err) {
      toast.error("Error al cargar estadísticas")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Administrar Escuelas" description="Gestión de instituciones educativas (Super Admin)">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAcademicYearsOpen(true)}>
            <Calendar className="size-4" /> Años Académicos
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger render={<Button><Plus className="size-4" /> Nueva Escuela</Button>} />
            <DialogContent className="sm:max-w-md">
              <SchoolForm onSuccess={() => setIsCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {schools && schools.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-12" />}
          title="Sin escuelas"
          description="No hay escuelas registradas en el sistema"
          action={{ label: "Nueva Escuela", onClick: () => setIsCreateOpen(true) }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {schools?.map((school) => (
            <Card key={school.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="size-4" />
                    </div>
                    <CardTitle className="text-sm truncate">{school.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={school.active ? "default" : "secondary"}>
                      {school.active ? "Activa" : "Inactiva"}
                    </Badge>
                    {!school.active && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={async () => {
                          try {
                            const supabase = createClient()
                            const { error } = await supabase
                              .from("schools")
                              .update({ active: true })
                              .eq("id", school.id)
                            if (error) throw error
                            toast.success("Escuela reactivada")
                            queryClient.invalidateQueries({ queryKey: ["schools"] })
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Error al reactivar escuela")
                          }
                        }}
                      >
                        <Check className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditSchool(school)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    {school.active && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteSchoolId(school.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                {(school.phone || school.email) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {school.phone && (
                      <span className="flex items-center gap-1">
                        <SchoolIcon className="size-3 shrink-0" />
                        {school.phone}
                      </span>
                    )}
                    {school.email && (
                      <span className="flex items-center gap-1">
                        <SchoolIcon className="size-3 shrink-0" />
                        {school.email}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-2 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleShowStats(school.id)}
                  >
                    Ver estadísticas
                  </Button>
                </div>

                {expandedSchool === school.id && stats[school.id] && (
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    <div className="rounded-md bg-muted py-2 text-center">
                      <p className="text-sm font-bold">{stats[school.id].studentsCount}</p>
                      <p className="text-[10px] text-muted-foreground">Alumnos</p>
                    </div>
                    <div className="rounded-md bg-muted py-2 text-center">
                      <p className="text-sm font-bold">{stats[school.id].teachersCount}</p>
                      <p className="text-[10px] text-muted-foreground">Docentes</p>
                    </div>
                    <div className="rounded-md bg-muted py-2 text-center">
                      <p className="text-sm font-bold">{stats[school.id].coursesCount}</p>
                      <p className="text-[10px] text-muted-foreground">Cursos</p>
                    </div>
                    <div className="rounded-md bg-muted py-2 text-center">
                      <p className="text-sm font-bold">{stats[school.id].divisionsCount}</p>
                      <p className="text-[10px] text-muted-foreground">Divisiones</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editSchool} onOpenChange={(open) => !open && setEditSchool(null)}>
        <DialogContent className="sm:max-w-md">
          <SchoolForm school={editSchool} onSuccess={() => setEditSchool(null)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteSchoolId}
        onOpenChange={() => setDeleteSchoolId(null)}
        title="Desactivar escuela"
        description="¿Está seguro? La escuela dejará de estar operativa pero los datos se conservarán."
        confirmLabel="Desactivar"
        onConfirm={async () => {
          if (!deleteSchoolId) return
          try {
            const supabase = createClient()
            await SchoolService.delete(supabase, deleteSchoolId)
            toast.success("Escuela desactivada")
            queryClient.invalidateQueries({ queryKey: ["schools"] })
            setDeleteSchoolId(null)
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al desactivar escuela")
          }
        }}
      />

      <AcademicYearsDialog
        open={isAcademicYearsOpen}
        onOpenChange={setIsAcademicYearsOpen}
      />
    </div>
  )
}

function AcademicYearsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newAY, setNewAY] = useState({ name: "", start_date: "", end_date: "" })
  const [deleteAyId, setDeleteAyId] = useState<string | null>(null)

  const { data: schools } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from("schools").select("id").eq("active", true).limit(1)
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
        .select("*")
        .order("start_date", { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!schools || schools.length === 0) throw new Error("No hay escuelas activas")
      const res = await fetch("/api/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newAY, school_id: schools[0].id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success("Año académico creado")
      setIsCreateOpen(false)
      setNewAY({ name: "", start_date: "", end_date: "" })
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
      setDeleteAyId(null)
      queryClient.invalidateQueries({ queryKey: ["admin-academic-years"] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al eliminar")
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Años Académicos</DialogTitle>
          <DialogDescription>
            Gestioná los períodos lectivos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger render={
              <Button size="sm" className="w-full"><Plus /> Nuevo Año Académico</Button>
            } />
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Nuevo Año Académico</DialogTitle>
                <DialogDescription>
                  Creá un nuevo período lectivo. Se activará automáticamente si no hay otro activo.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
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
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !newAY.name || !newAY.start_date || !newAY.end_date}
                >
                  {createMutation.isPending ? "Creando..." : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Cargando...
            </div>
          ) : !academicYears || academicYears.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Calendar className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Sin años académicos registrados
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {academicYears.map((ay) => (
                <Card key={ay.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <Calendar className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 ml-2">
                        <CardTitle className="text-sm">{ay.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {ay.start_date} — {ay.end_date}
                        </CardDescription>
                      </div>
                      <Badge variant={ay.active ? "default" : "secondary"}>
                        {ay.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {!ay.active ? (
                        <Button variant="outline" size="sm" className="text-xs"
                          onClick={() => toggleActiveMutation.mutate({ id: ay.id, active: true })}
                          disabled={toggleActiveMutation.isPending}
                        ><Check /> Activar</Button>
                      ) : (
                        <Button variant="outline" size="sm" className="text-xs"
                          onClick={() => toggleActiveMutation.mutate({ id: ay.id, active: false })}
                          disabled={toggleActiveMutation.isPending}
                        ><X /> Desactivar</Button>
                      )}
                      <Button variant="outline" size="sm" className="text-xs text-destructive"
                        onClick={() => setDeleteAyId(ay.id)}
                        disabled={deleteMutation.isPending}
                      ><Trash2 /> Eliminar</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <ConfirmDialog
          open={!!deleteAyId}
          onOpenChange={() => setDeleteAyId(null)}
          title="Eliminar año académico"
          description="¿Está seguro de eliminar este año académico? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={() => deleteAyId && deleteMutation.mutate(deleteAyId)}
        />
      </DialogContent>
    </Dialog>
  )
}

function SchoolForm({
  school,
  onSuccess,
}: {
  school?: School | null
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(school?.name || "")
  const [address, setAddress] = useState(school?.address || "")
  const [phone, setPhone] = useState(school?.phone || "")
  const [email, setEmail] = useState(school?.email || "")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const supabase = createClient()
      if (school) {
        await SchoolService.update(supabase, school.id, { name, address, phone, email })
        toast.success("Escuela actualizada correctamente")
      } else {
        await SchoolService.create(supabase, { name, address, phone, email })
        toast.success("Escuela creada correctamente")
      }
      queryClient.invalidateQueries({ queryKey: ["schools"] })
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar escuela")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{school ? "Editar Escuela" : "Nueva Escuela"}</DialogTitle>
        <DialogDescription>
          {school
            ? "Modificá los datos de la institución."
            : "Completá los datos para registrar una nueva escuela."}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="s-name">Nombre</Label>
          <Input
            id="s-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-address">Dirección</Label>
          <Input
            id="s-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="s-phone">Teléfono</Label>
            <Input
              id="s-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-email">Email</Label>
            <Input
              id="s-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : school ? "Guardar Cambios" : "Crear Escuela"}
        </Button>
      </DialogFooter>
    </form>
  )
}
