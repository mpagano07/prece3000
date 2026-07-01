"use client"

import { useState, useRef } from "react"
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Search,
  Eye,
  X,
  FileImage,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { useStudentSearch } from "@/hooks/use-students"
import { useStudentDocuments, useUploadDocument, useDeleteDocument } from "@/hooks/use-documents"
import { DOCUMENT_TYPES } from "@/lib/constants"
import { formatDate, isImageFile } from "@/lib/utils"
import type { DocumentType } from "@/types/database"

export default function DocumentsPage() {
  const [studentSearch, setStudentSearch] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [selectedStudentName, setSelectedStudentName] = useState("")
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string; type: string } | null>(null)

  const { data: students } = useStudentSearch(studentSearch)
  const { data: documents, isLoading, error } = useStudentDocuments(
    selectedStudentId || ""
  )
  const uploadDoc = useUploadDocument()
  const deleteDoc = useDeleteDocument()

  return (
    <div className="space-y-6">
      <PageHeader title="Documentos" description="Gestión de documentación de estudiantes">
        {selectedStudentId && (
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger render={<Button><Upload className="size-4" /> Subir Documento</Button>} />
            <DialogContent className="sm:max-w-md">
              <UploadDocumentForm
                studentId={selectedStudentId}
                onSuccess={() => setIsUploadOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar estudiante..."
          value={studentSearch}
          onChange={(e) => {
            setStudentSearch(e.target.value)
            if (e.target.value !== studentSearch) {
              setSelectedStudentId(null)
              setSelectedStudentName("")
            }
          }}
          className="pl-8"
        />
        {students && students.length > 0 && !selectedStudentId && (
          <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border bg-popover shadow-lg">
            {students.map((s) => (
              <button
                type="button"
                key={s.id}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                onClick={() => {
                  const name = `${s.first_name} ${s.last_name}`
                  setSelectedStudentId(s.id)
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

      {!selectedStudentId && (
        <EmptyState
          icon={<FileText className="size-12" />}
          title="Seleccioná un estudiante"
          description="Buscá y seleccioná un estudiante para ver sus documentos"
        />
      )}

      {selectedStudentId && isLoading && <LoadingScreen />}

      {selectedStudentId && error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          Error al cargar documentos: {(error as Error).message}
        </div>
      )}

      {selectedStudentId && documents && documents.length === 0 && (
        <EmptyState
          icon={<FileText className="size-12" />}
          title="Sin documentos"
          description={`${selectedStudentName} no tiene documentos cargados`}
          action={{ label: "Subir Documento", onClick: () => setIsUploadOpen(true) }}
        />
      )}

      {selectedStudentId && documents && documents.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => {
            const isImage = isImageFile(doc.name)
            return (
              <Card key={doc.id} className="overflow-hidden">
                {isImage && (
                  <div
                    className="relative aspect-video cursor-pointer bg-muted"
                    onClick={() =>
                      setPreviewDoc({ name: doc.name, url: doc.file_url, type: "image" })
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={doc.file_url}
                      alt={doc.name}
                      className="size-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/0 text-white/0 transition-all hover:bg-black/40 hover:text-white">
                      <Eye className="size-5" />
                      <span className="text-sm font-medium">Vista previa</span>
                    </div>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {isImage ? (
                          <FileImage className="size-5" />
                        ) : (
                          <FileText className="size-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-sm">{doc.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(doc.uploaded_at)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label || doc.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPreviewDoc({ name: doc.name, url: doc.file_url, type: isImage ? "image" : "pdf" })
                      }
                    >
                      <Eye className="size-3.5" />
                      Ver
                    </Button>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                      <Button variant="outline" size="sm">
                        <Download className="size-3.5" />
                        Descargar
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(doc.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <DocumentPreviewDialog
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Eliminar documento"
        description="¿Está seguro de eliminar este documento? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        loading={deleteDoc.isPending}
        onConfirm={async () => {
          if (deleteId) {
            await deleteDoc.mutateAsync(deleteId)
            setDeleteId(null)
          }
        }}
      />
    </div>
  )
}

function DocumentPreviewDialog({
  doc,
  onClose,
}: {
  doc: { name: string; url: string; type: string } | null
  onClose: () => void
}) {
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
          {doc?.type === "image" ? (
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

function UploadDocumentForm({
  studentId,
  onSuccess,
}: {
  studentId: string
  onSuccess: () => void
}) {
  const uploadDoc = useUploadDocument()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState<DocumentType | "">("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !type) return
    await uploadDoc.mutateAsync({
      school_id: "",
      student_id: studentId,
      name: file.name,
      type: type as DocumentType,
      file_url: "",
      uploaded_by: "",
      uploaded_at: "",
      file,
    } as any)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Subir Documento</DialogTitle>
        <DialogDescription>
          Seleccione un archivo y el tipo de documento.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="doc-type">Tipo de documento</Label>
          <Select value={type} onValueChange={(v) => setType(v as DocumentType)}>
            <SelectTrigger id="doc-type">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="file">Archivo</Label>
          <Input
            id="file"
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Formatos aceptados: PDF, JPG, PNG
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={uploadDoc.isPending || !file || !type}>
          {uploadDoc.isPending ? "Subiendo..." : "Subir Documento"}
        </Button>
      </DialogFooter>
    </form>
  )
}
