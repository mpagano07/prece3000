import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getDocumentsByStudent, uploadDocument, deleteDocument } from "@/services/documents"
import { useAuth } from "@/contexts/auth-context"
import type { Document } from "@/types/database"

export function useStudentDocuments(studentId: string) {
  const { school } = useAuth()

  return useQuery({
    queryKey: ["documents", school?.id, studentId],
    queryFn: () => getDocumentsByStudent(studentId),
    enabled: !!school?.id && !!studentId,
  })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()
  const { school } = useAuth()

  return useMutation({
    mutationFn: (
      data: Omit<Document, "id" | "uploadedAt" | "fileUrl"> & { file?: File }
    ) => uploadDocument(data.schoolId, data.studentId, data.file!, data.type, data.uploadedBy),
    onSuccess: (_, variables) => {
      toast.success("Documento subido correctamente")
      queryClient.invalidateQueries({
        queryKey: ["documents", school?.id, variables.studentId],
      })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al subir documento"
      )
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  const { school } = useAuth()

  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId, ""),
    onSuccess: () => {
      toast.success("Documento eliminado correctamente")
      queryClient.invalidateQueries({ queryKey: ["documents", school?.id] })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar documento"
      )
    },
  })
}
