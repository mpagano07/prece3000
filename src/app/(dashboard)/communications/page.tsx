"use client"

import { useState, useMemo } from "react"
import {
  MessageSquare,
  Plus,
  Search,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { useAuth } from "@/contexts/auth-context"
import { useStudentSearch } from "@/hooks/use-students"
import { useStudentCommunications, useCreateCommunication } from "@/hooks/use-communications"
import { formatDateTime } from "@/lib/utils"
import type { CommunicationType } from "@/types/database"

const TEMPLATES = [
  {
    id: "absence",
    label: "Aviso de Inasistencia",
    message:
      "Estimada familia, le informamos que el/la alumno/a [NOMBRE] ha registrado inasistencias en la fecha [FECHA]. Solicitamos justificar a la brevedad. Saludos cordiales.",
  },
  {
    id: "summons",
    label: "Citación",
    message:
      "Por medio de la presente, se cita al Sr/a. responsable de [NOMBRE] a una reunión con el equipo directivo el día [FECHA] a las [HORA]. Agradecemos su presencia.",
  },
  {
    id: "meeting",
    label: "Recordatorio de Reunión",
    message:
      "Recordamos la reunión de padres programada para el día [FECHA] a las [HORA] en las instalaciones del establecimiento. Su presencia es importante.",
  },
  {
    id: "conduct",
    label: "Informe de Conducta",
    message:
      "Nos dirigimos a usted para informarle acerca de situaciones de conducta observadas en [NOMBRE] durante la presente semana. Solicitamos comunicación a la brevedad.",
  },
  {
    id: "general",
    label: "Comunicado General",
    message:
      "Estimada familia, le comunicamos que [MENSAJE]. Ante cualquier duda, comunicarse con la institución. Saludos cordiales.",
  },
]

const STATUS_ICONS: Record<string, React.ReactNode> = {
  sent: <CheckCircle2 className="size-3.5 text-green-500" />,
  pending: <Clock className="size-3.5 text-yellow-500" />,
  failed: <XCircle className="size-3.5 text-red-500" />,
}

const STATUS_LABELS: Record<string, string> = {
  sent: "Enviado",
  pending: "Pendiente",
  failed: "Falló",
}

export default function CommunicationsPage() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<CommunicationType | "all">("all")
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedComm, setSelectedComm] = useState<string | null>(null)

  const { data: allComms, isLoading: commsLoading } = useStudentCommunications(
    selectedStudentId || ""
  )

  const filtered = useMemo(() => {
    if (!allComms) return []
    let result = allComms
    if (typeFilter !== "all") {
      result = result.filter((c) => c.type === typeFilter)
    }
    return result
  }, [allComms, typeFilter])

  if (commsLoading) return <LoadingScreen />

  return (
    <div className="space-y-6">
      <PageHeader title="Comunicaciones" description="Registro de comunicaciones con familias">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button><Plus className="size-4" /> Nueva Comunicación</Button>} />
          <DialogContent className="sm:max-w-xl">
            <NewCommunicationForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar estudiante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as CommunicationType | "all")}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="size-12" />}
          title="Sin comunicaciones"
          description={search ? "No se encontraron comunicaciones" : "Seleccione un estudiante para ver sus comunicaciones"}
          action={{ label: "Nueva Comunicación", onClick: () => setIsCreateOpen(true) }}
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((comm) => (
            <Dialog
              key={comm.id}
              open={selectedComm === comm.id}
              onOpenChange={(open) => setSelectedComm(open ? comm.id : null)}
            >
              <DialogTrigger>
                <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {comm.type === "whatsapp" ? (
                          <div className="flex size-8 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                            <Phone className="size-4" />
                          </div>
                        ) : (
                          <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            <Mail className="size-4" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-sm">
                            {comm.sent_to}
                          </CardTitle>
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {comm.message}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {STATUS_ICONS[comm.status]}
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {STATUS_LABELS[comm.status] || comm.status}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {formatDateTime(comm.sent_at)}
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Detalle de Comunicación</DialogTitle>
                  <DialogDescription>
                    <Badge variant={comm.type === "whatsapp" ? "default" : "secondary"}>
                      {comm.type === "whatsapp" ? "WhatsApp" : "Email"}
                    </Badge>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted p-3 text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Enviado a:</span>
                      <span className="font-medium">{comm.sent_to}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Estado:</span>
                      <span className="flex items-center gap-1">
                        {STATUS_ICONS[comm.status]}
                        {STATUS_LABELS[comm.status] || comm.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Fecha:</span>
                      <span>{formatDateTime(comm.sent_at)}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-medium">Mensaje</h4>
                    <p className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm leading-relaxed">
                      {comm.message}
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </div>
  )
}

function NewCommunicationForm({ onSuccess }: { onSuccess: () => void }) {
  const createComm = useCreateCommunication()
  const [studentSearch, setStudentSearch] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [selectedStudentName, setSelectedStudentName] = useState("")
  const [type, setType] = useState<CommunicationType | "">("")
  const [message, setMessage] = useState("")
  const [sentTo, setSentTo] = useState("")
  const [template, setTemplate] = useState("")

  const { data: students } = useStudentSearch(studentSearch)

  const handleTemplateChange = (templateId: string) => {
    setTemplate(templateId)
    const t = TEMPLATES.find((t) => t.id === templateId)
    if (t) {
      setMessage(
        t.message
          .replace("[NOMBRE]", selectedStudentName)
          .replace("[FECHA]", new Date().toLocaleDateString("es-AR"))
          .replace("[HORA]", new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }))
          .replace("[MENSAJE]", "")
      )
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentId || !type || !message || !sentTo) return
    await createComm.mutateAsync({
      school_id: "",
      student_id: selectedStudentId,
      type: type as CommunicationType,
      message,
      sent_to: sentTo,
      status: "sent",
    })
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Nueva Comunicación</DialogTitle>
        <DialogDescription>
          Registre una comunicación enviada a la familia.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label>Estudiante</Label>
          <Input
            value={studentSearch}
            onChange={(e) => {
              setStudentSearch(e.target.value)
              setSelectedStudentId(null)
              setSelectedStudentName("")
            }}
            placeholder="Buscar estudiante..."
          />
          {students && students.length > 0 && !selectedStudentId && (
            <div className="max-h-32 overflow-y-auto rounded-lg border">
              {students.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                  onClick={() => {
                    setSelectedStudentId(s.id)
                    const name = `${s.first_name} ${s.last_name}`
                    setSelectedStudentName(name)
                    setStudentSearch(name)
                  }}
                >
                  {s.first_name} {s.last_name} - {s.dni}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="comm-type">Tipo</Label>
          <Select value={type} onValueChange={(v) => setType(v as CommunicationType)}>
            <SelectTrigger id="comm-type">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sent-to">Enviar a</Label>
          <Input
            id="sent-to"
            value={sentTo}
            onChange={(e) => setSentTo(e.target.value)}
            placeholder={type === "whatsapp" ? "Número de teléfono" : "Correo electrónico"}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="template">Plantilla</Label>
          <Select value={template} onValueChange={(v) => handleTemplateChange(v ?? "")}>
            <SelectTrigger id="template">
              <SelectValue placeholder="Seleccionar plantilla" />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="comm-message">Mensaje</Label>
          <Textarea
            id="comm-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            required
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={createComm.isPending || !selectedStudentId || !type || !message || !sentTo}>
          {createComm.isPending ? (
            <>
              <Send className="size-4 animate-pulse" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="size-4" />
              Registrar Comunicación
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
