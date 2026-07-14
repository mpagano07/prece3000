"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useStudent, useStudentHistory } from "@/hooks/use-students"
import { useAuth } from "@/contexts/auth-context"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import {
  ArrowLeft,
  Pencil,
  Mail,
  MessageSquare,
  LogOut,
  BookOpen,
  User,
  MapPin,
  Heart,
  Users,
  ShieldCheck,
  Calendar,
  FileText,
  Clock,
  AlertTriangle,
  ChevronRight,
  Eye,
  Download,
  X,
} from "lucide-react"
import { getInitials, formatDate, formatDateTime } from "@/lib/utils"
import {
  SEX_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  RELATIONSHIP_OPTIONS,
  ATTENDANCE_STATUS,
  BOOK_ENTRY_TYPES,
} from "@/lib/constants"
import type {
  StudentGuardian,
  AuthorizedPerson,
} from "@/types/database"
import { getGuardians, getAuthorizedPersons } from "@/services/students"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function StudentDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { school } = useAuth()
  const { data: student, isLoading, error } = useStudent(id)
  const { data: history, isLoading: historyLoading } = useStudentHistory(id)
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string } | null>(null)
  const { data: guardians } = useQuery({
    queryKey: ["students", school?.id, id, "guardians"],
    queryFn: async () => {
      return getGuardians(id) as Promise<StudentGuardian[]>
    },
    enabled: !!id,
  })
  const { data: authorizedPersons } = useQuery({
    queryKey: ["students", school?.id, id, "authorized-persons"],
    queryFn: async () => {
      return getAuthorizedPersons(id) as Promise<AuthorizedPerson[]>
    },
    enabled: !!id,
  })

  if (isLoading) return <LoadingScreen />

  if (error || !student) {
    return (
      <div className="space-y-6">
        <PageHeader title="Alumno no encontrado">
          <Button variant="outline" onClick={() => router.push("/students")}>
            <ArrowLeft className="size-4" />
            Volver
          </Button>
        </PageHeader>
        <EmptyState
          icon={<User className="size-12" />}
          title="Alumno no encontrado"
          description="El alumno solicitado no existe o ha sido eliminado"
          action={{
            label: "Ver todos los alumnos",
            onClick: () => router.push("/students"),
          }}
        />
      </div>
    )
  }

  const genderLabel =
    SEX_OPTIONS.find((o) => o.value === student.gender)?.label ?? student.gender
  const bloodTypeLabel =
    BLOOD_TYPE_OPTIONS.find((o) => o.value === student.bloodType)?.label ??
    student.bloodType

  const statusBadge: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    inactive: "secondary",
    graduated: "outline",
  }

  const statusLabel: Record<string, string> = {
    active: "Activo",
    inactive: "Inactivo",
    graduated: "Graduado",
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Ficha del Alumno">
        <Button variant="outline" onClick={() => router.push("/students")}>
          <ArrowLeft className="size-4" />
          Volver
        </Button>
        <Button onClick={() => router.push(`/students/${id}/edit`)}>
          <Pencil className="size-4" />
          Editar
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full space-y-6 lg:w-80">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 pt-6">
              <Avatar size="lg" className="size-24">
                {student.photoUrl && <AvatarImage src={student.photoUrl} />}
                <AvatarFallback className="text-lg">
                  {getInitials(student.firstName, student.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h2 className="text-lg font-semibold">
                  {student.lastName}, {student.firstName}
                </h2>
                <p className="text-sm text-muted-foreground">{student.dni}</p>
                <Badge
                  variant={statusBadge[student.status ?? ""] ?? "outline"}
                  className="mt-2"
                >
                  {statusLabel[student.status ?? ""] ?? student.status}
                </Badge>
              </div>
              <div className="flex w-full flex-col gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(
                      `https://wa.me/${student.phone}`,
                      "_blank"
                    )
                  }
                >
                  <MessageSquare className="size-4" />
                  Enviar WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(`mailto:${student.email}`, "_blank")
                  }
                >
                  <Mail className="size-4" />
                  Enviar Email
                </Button>
                <Button variant="outline" size="sm">
                  <LogOut className="size-4" />
                  Registrar Retiro
                </Button>
                <Button variant="outline" size="sm">
                  <BookOpen className="size-4" />
                  Agregar al Libro
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 space-y-6">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="info">
                <User className="size-4" />
                Información
              </TabsTrigger>
              <TabsTrigger value="contact">
                <MapPin className="size-4" />
                Contacto
              </TabsTrigger>
              <TabsTrigger value="medical">
                <Heart className="size-4" />
                Médica
              </TabsTrigger>
              <TabsTrigger value="guardians">
                <Users className="size-4" />
                Responsables
              </TabsTrigger>
              <TabsTrigger value="authorized">
                <ShieldCheck className="size-4" />
                Autorizados
              </TabsTrigger>
              <TabsTrigger value="history">
                <Clock className="size-4" />
                Historial
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Datos Personales</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">Nombre</dt>
                      <dd className="text-sm font-medium">
                        {student.firstName} {student.lastName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">DNI</dt>
                      <dd className="text-sm font-medium">{student.dni}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Fecha de Nacimiento
                      </dt>
                      <dd className="text-sm font-medium">
                        {student.birthDate
                          ? formatDate(student.birthDate)
                          : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Sexo</dt>
                      <dd className="text-sm font-medium">
                        {genderLabel ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Nacionalidad
                      </dt>
                      <dd className="text-sm font-medium">
                        {student.nationality ?? "-"}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Información de Contacto</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Domicilio
                      </dt>
                      <dd className="text-sm font-medium">
                        {student.address ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Teléfono
                      </dt>
                      <dd className="text-sm font-medium">
                        {student.phone ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Email</dt>
                      <dd className="text-sm font-medium">
                        {student.email ?? "-"}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="medical" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Información Médica</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Grupo Sanguíneo
                      </dt>
                      <dd className="text-sm font-medium">
                        {bloodTypeLabel ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Obra Social
                      </dt>
                      <dd className="text-sm font-medium">
                        {student.healthInsurance ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        N° de Afiliado
                      </dt>
                      <dd className="text-sm font-medium">
                        {student.healthAffiliateNumber ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Médico de Cabecera
                      </dt>
                      <dd className="text-sm font-medium">
                        {student.doctorName ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Tel. del Médico
                      </dt>
                      <dd className="text-sm font-medium">
                        {student.doctorPhone ?? "-"}
                      </dd>
                    </div>
                  </dl>
                  <Separator className="my-4" />
                  <div className="space-y-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Alergias
                      </dt>
                      <dd className="text-sm">
                        {student.allergies ?? "Sin alergias registradas"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Medicación
                      </dt>
                      <dd className="text-sm">
                        {student.medication ??
                          "Sin medicación registrada"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Restricciones
                      </dt>
                      <dd className="text-sm">
                        {student.restrictions ??
                          "Sin restricciones registradas"}
                      </dd>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="guardians" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Responsables</CardTitle>
                </CardHeader>
                <CardContent>
                  {!guardians || guardians.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No hay responsables registrados
                    </p>
                  ) : (
                    <div className="divide-y">
                      {guardians.map((guardian) => {
                        const relLabel =
                          RELATIONSHIP_OPTIONS.find(
                            (o) => o.value === guardian.relationship
                          )?.label ?? guardian.relationship
                        return (
                          <div
                            key={guardian.id}
                            className="flex items-center justify-between py-3"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {guardian.name}
                              </p>
                              <Badge variant="secondary" className="mt-0.5">
                                {relLabel}
                              </Badge>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              {guardian.phone && <p>{guardian.phone}</p>}
                              {guardian.email && (
                                <p className="text-xs">{guardian.email}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="authorized" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personas Autorizadas</CardTitle>
                </CardHeader>
                <CardContent>
                  {!authorizedPersons ||
                  authorizedPersons.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No hay personas autorizadas registradas
                    </p>
                  ) : (
                    <div className="divide-y">
                      {authorizedPersons.map((person) => (
                        <div
                          key={person.id}
                          className="flex items-center justify-between py-3"
                        >
                          <p className="text-sm font-medium">{person.name}</p>
                          <div className="text-right text-sm text-muted-foreground">
                            {person.phone && <p>{person.phone}</p>}
                            {person.document && (
                              <p className="text-xs">{person.document}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Historial del Alumno</CardTitle>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <LoadingScreen />
                  ) : !history ? (
                    <p className="text-sm text-muted-foreground">
                      No hay historial disponible
                    </p>
                  ) : (
                    <div className="space-y-8">
                      {history.attendance.length > 0 && (
                        <div>
                          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
                            <Calendar className="size-4 text-blue-500" />
                            Asistencia
                          </h4>
                          <div className="space-y-2">
                            {history.attendance.slice(0, 10).map((record) => {
                              const statusInfo = ATTENDANCE_STATUS.find(
                                (s) => s.value === record.status
                              )
                              return (
                                <div
                                  key={record.id}
                                  className="flex items-center justify-between rounded-lg border p-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={
                                        statusInfo?.color ?? "text-muted-foreground"
                                      }
                                    >
                                      <Calendar className="size-4" />
                                    </span>
                                    <div>
                                      <p className="text-sm">
                                        {formatDate(record.date)}
                                      </p>
                                      {record.observation && (
                                        <p className="text-xs text-muted-foreground">
                                          {record.observation}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <Badge
                                    variant={
                                      record.status === "present"
                                        ? "default"
                                        : record.status === "absent"
                                          ? "destructive"
                                          : "secondary"
                                    }
                                  >
                                    {statusInfo?.label ?? record.status}
                                  </Badge>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {history.bookEntries.length > 0 && (
                        <div>
                          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
                            <BookOpen className="size-4 text-orange-500" />
                            Libro de Preceptor
                          </h4>
                          <div className="space-y-2">
                            {history.bookEntries
                              .slice(0, 10)
                              .map((entry) => {
                                const typeInfo = BOOK_ENTRY_TYPES.find(
                                  (t) => t.value === entry.type
                                )
                                return (
                                  <div
                                    key={entry.id}
                                    className="rounded-lg border p-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <AlertTriangle className="size-4 text-muted-foreground" />
                                        <p className="text-sm font-medium">
                                          {entry.title}
                                        </p>
                                      </div>
                                      <Badge variant="secondary">
                                        {typeInfo?.label ?? entry.type}
                                      </Badge>
                                    </div>
                                    {entry.description && (
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {entry.description}
                                      </p>
                                    )}
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {entry.createdAt ? formatDateTime(entry.createdAt) : ""}
                                    </p>
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      )}

                      {history.communications.length > 0 && (
                        <div>
                          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
                            <MessageSquare className="size-4 text-green-500" />
                            Comunicaciones
                          </h4>
                          <div className="space-y-2">
                            {history.communications
                              .slice(0, 10)
                              .map((comm) => (
                                <div
                                  key={comm.id}
                                  className="rounded-lg border p-3"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {comm.type === "whatsapp" ? (
                                        <MessageSquare className="size-4 text-green-500" />
                                      ) : (
                                        <Mail className="size-4 text-blue-500" />
                                      )}
                                      <p className="text-sm font-medium">
                                        {comm.type === "whatsapp"
                                          ? "WhatsApp"
                                          : "Email"}
                                      </p>
                                    </div>
                                    <Badge variant="secondary">
                                      {comm.status}
                                    </Badge>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                    {comm.message}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {formatDateTime(comm.sentAt)} - Enviado a:{" "}
                                    {comm.sentTo}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {history.documents.length > 0 && (
                        <div>
                          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
                            <FileText className="size-4 text-purple-500" />
                            Documentos
                          </h4>
                          <div className="space-y-2">
                            {history.documents
                              .slice(0, 10)
                              .map((doc) => (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between rounded-lg border p-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium">
                                        {doc.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {doc.uploadedAt ? formatDate(doc.uploadedAt) : ""}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() =>
                                        setPreviewDoc({ name: doc.name, url: doc.fileUrl })
                                      }
                                    >
                                      <Eye className="size-4" />
                                    </Button>
                                    <a
                                      href={doc.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download
                                    >
                                      <Button variant="ghost" size="icon-sm">
                                        <Download className="size-4" />
                                      </Button>
                                    </a>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {history.attendance.length === 0 &&
                        history.bookEntries.length === 0 &&
                        history.communications.length === 0 &&
                        history.documents.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            No hay actividad registrada para este alumno
                          </p>
                        )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <DocumentPreviewDialog
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  )
}

function DocumentPreviewDialog({
  doc,
  onClose,
}: {
  doc: { name: string; url: string } | null
  onClose: () => void
}) {
  const isImage = doc ? /\.(jpg|jpeg|png|webp)$/i.test(doc.url) : false

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate">{doc?.name ?? ""}</DialogTitle>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex items-center justify-center rounded-lg bg-muted/50 p-2">
          {doc && isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doc.url}
              alt={doc.name}
              className="max-h-[70vh] w-full rounded-md object-contain"
            />
          ) : doc ? (
            <iframe
              src={doc.url}
              className="h-[70vh] w-full rounded-md"
              title={doc.name}
            />
          ) : null}
        </div>
        <DialogFooter>
          <a
            href={doc?.url ?? ""}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="w-full sm:w-auto"
          >
            <Button className="w-full">
              <Download className="size-4" />
              Descargar
            </Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
