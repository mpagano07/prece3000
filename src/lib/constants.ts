import type {
  Role,
  AttendanceStatus,
  BookEntryType,
  EventType,
  DocumentType,
} from "@/types/database"

export const ROLES: { value: Role; label: string }[] = [
  { value: "super_admin", label: "Super Administrador" },
  { value: "school_admin", label: "Administrador Escolar" },
  { value: "director", label: "Director" },
  { value: "preceptor", label: "Preceptor" },
  { value: "secretary", label: "Secretario" },
  { value: "teacher", label: "Docente" },
]

export const ATTENDANCE_STATUS: {
  value: AttendanceStatus
  label: string
  color: string
}[] = [
  { value: "present", label: "Presente", color: "text-green-600" },
  { value: "absent", label: "Ausente", color: "text-red-600" },
  {
    value: "absent_justified",
    label: "Ausente Justificado",
    color: "text-yellow-600",
  },
  { value: "late", label: "Tarde", color: "text-orange-600" },
  {
    value: "early_withdrawal",
    label: "Retiro Anticipado",
    color: "text-blue-600",
  },
]

export const BOOK_ENTRY_TYPES: { value: BookEntryType; label: string }[] = [
  { value: "incident", label: "Incidencia" },
  { value: "sanction", label: "Sanción" },
  { value: "warning", label: "Llamado de Atención" },
  { value: "phone_call", label: "Llamada Telefónica" },
  { value: "interview", label: "Entrevista" },
  { value: "meeting", label: "Reunión" },
  { value: "observation", label: "Observación" },
  { value: "conduct_followup", label: "Seguimiento de Conducta" },
]

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "act", label: "Acto" },
  { value: "institutional", label: "Institucional" },
  { value: "holiday", label: "Feriado" },
  { value: "exam", label: "Examen" },
  { value: "meeting", label: "Reunión" },
  { value: "report_delivery", label: "Entrega de Boletines" },
]

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "medical_certificate", label: "Certificado Médico" },
  { value: "authorization", label: "Autorización" },
  { value: "dni", label: "DNI" },
  { value: "receipt", label: "Recibo" },
  { value: "school_insurance", label: "Seguro Escolar" },
  { value: "other", label: "Otro" },
]

export const SEX_OPTIONS = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
  { value: "other", label: "Otro" },
]

export const RELATIONSHIP_OPTIONS = [
  { value: "father", label: "Padre" },
  { value: "mother", label: "Madre" },
  { value: "guardian", label: "Tutor" },
  { value: "grandparent", label: "Abuelo" },
  { value: "aunt_uncle", label: "Tío" },
  { value: "sibling", label: "Hermano" },
  { value: "other", label: "Otro" },
]

export const BLOOD_TYPE_OPTIONS = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
]
