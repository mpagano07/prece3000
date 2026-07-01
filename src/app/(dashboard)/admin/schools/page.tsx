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
  CardAction,
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
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button><Plus className="size-4" /> Nueva Escuela</Button>} />
          <DialogContent className="sm:max-w-md">
            <SchoolForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </PageHeader>

      {schools && schools.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-12" />}
          title="Sin escuelas"
          description="No hay escuelas registradas en el sistema"
          action={{ label: "Nueva Escuela", onClick: () => setIsCreateOpen(true) }}
        />
      ) : (
        <div className="grid gap-4">
          {schools?.map((school) => (
            <Card key={school.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{school.name}</CardTitle>
                      <CardDescription>
                        {school.address || "Sin dirección"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={school.active ? "default" : "secondary"}>
                      {school.active ? "Activa" : "Inactiva"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditSchool(school)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteSchoolId(school.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:flex sm:gap-4">
                  {school.phone && (
                    <span className="flex items-center gap-1">
                      <SchoolIcon className="size-3" />
                      {school.phone}
                    </span>
                  )}
                  {school.email && (
                    <span className="flex items-center gap-1">
                      <SchoolIcon className="size-3" />
                      {school.email}
                    </span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => handleShowStats(school.id)}
                >
                  Ver estadísticas
                </Button>

                {expandedSchool === school.id && stats[school.id] && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <Users className="mx-auto mb-1 size-4 text-muted-foreground" />
                      <p className="text-lg font-bold">
                        {stats[school.id].studentsCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Estudiantes</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <GraduationCap className="mx-auto mb-1 size-4 text-muted-foreground" />
                      <p className="text-lg font-bold">
                        {stats[school.id].teachersCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Docentes</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <BookOpen className="mx-auto mb-1 size-4 text-muted-foreground" />
                      <p className="text-lg font-bold">
                        {stats[school.id].coursesCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Cursos</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <Layers className="mx-auto mb-1 size-4 text-muted-foreground" />
                      <p className="text-lg font-bold">
                        {stats[school.id].divisionsCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Divisiones</p>
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
        description="¿Está seguro de desactivar esta escuela? Los datos se conservarán pero la escuela dejará de estar operativa."
        confirmLabel="Desactivar"
        onConfirm={async () => {
          if (!deleteSchoolId) return
          try {
            const supabase = createClient()
            await SchoolService.delete(supabase, deleteSchoolId)
            toast.success("Escuela desactivada correctamente")
            queryClient.invalidateQueries({ queryKey: ["schools"] })
            setDeleteSchoolId(null)
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al desactivar escuela")
          }
        }}
      />
    </div>
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
