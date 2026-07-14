export type Role = "super_admin" | "school_admin" | "director" | "preceptor" | "secretary" | "teacher"

export type AttendanceStatus = "present" | "absent" | "absent_justified" | "late" | "early_withdrawal"

export type EmployeeAttendanceStatus = "present" | "absent" | "late" | "justified_absence"

export type BookEntryType =
  | "incident"
  | "sanction"
  | "warning"
  | "phone_call"
  | "interview"
  | "meeting"
  | "observation"
  | "conduct_followup"

export type EventType = "act" | "institutional" | "holiday" | "exam" | "meeting" | "report_delivery"

export type CommunicationType = "whatsapp" | "email"

export type DocumentType = "medical_certificate" | "authorization" | "dni" | "receipt" | "school_insurance" | "other"

export type AlertType =
  | "excessive_absences"
  | "near_failing"
  | "missing_documentation"
  | "incomplete_data"
  | "birthday"
  | "pending_communication"

export interface School {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  logoUrl: string | null
  active: boolean | null
  createdAt: Date | null
  updatedAt: Date | null
}

export interface Profile {
  id: string
  schoolId: string | null
  role: Role
  firstName: string
  lastName: string
  email: string
  phone: string | null
  avatarUrl: string | null
  deactivatedAt: Date | null
  createdAt: Date | null
  updatedAt: Date | null
}

export interface AcademicYear {
  id: string
  schoolId: string
  name: string
  startDate: string
  endDate: string
  active: boolean | null
}

export interface Course {
  id: string
  schoolId: string
  name: string
  academicYearId: string
}

export interface Division {
  id: string
  schoolId: string
  courseId: string
  name: string
  shift: string | null
  academicYearId: string
  preceptorId: string | null
}

export interface Subject {
  id: string
  schoolId: string
  name: string
  academicYearId: string
}

export interface Student {
  id: string
  schoolId: string
  divisionId: string | null
  firstName: string
  lastName: string
  dni: string
  birthDate: string | null
  gender: string | null
  nationality: string | null
  address: string | null
  phone: string | null
  email: string | null
  photoUrl: string | null
  bloodType: string | null
  healthInsurance: string | null
  healthAffiliateNumber: string | null
  doctorName: string | null
  doctorPhone: string | null
  allergies: string | null
  medication: string | null
  restrictions: string | null
  observations: string | null
  status: string | null
  academicYearId: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

export interface StudentGuardian {
  id: string
  studentId: string
  name: string
  phone: string | null
  email: string | null
  relationship: string
}

export interface AuthorizedPerson {
  id: string
  studentId: string
  name: string
  phone: string | null
  document: string | null
}

export interface Attendance {
  id: string
  schoolId: string
  studentId: string
  divisionId: string
  date: string
  status: AttendanceStatus
  observation: string | null
  createdBy: string
  createdAt: Date | null
  updatedAt: Date | null
}

export interface AttendanceLog {
  id: string
  attendanceId: string
  previousStatus: AttendanceStatus | null
  newStatus: AttendanceStatus
  changedBy: string
  changedAt: Date | null
}

export interface PreceptorBookEntry {
  id: string
  schoolId: string
  type: BookEntryType
  title: string
  description: string
  studentId: string | null
  createdBy: string
  createdAt: Date | null
}

export interface Communication {
  id: string
  schoolId: string
  studentId: string
  type: CommunicationType
  message: string
  sentTo: string
  sentAt: Date
  status: string | null
}

export interface Document {
  id: string
  schoolId: string
  studentId: string
  name: string
  type: DocumentType
  fileUrl: string
  uploadedBy: string
  uploadedAt: Date | null
}

export interface CalendarEvent {
  id: string
  schoolId: string
  title: string
  description: string | null
  startDate: Date
  endDate: Date | null
  type: EventType
  allDay: boolean | null
  createdBy: string
  createdAt: Date | null
}

export interface Withdrawal {
  id: string
  schoolId: string
  studentId: string
  withdrawnBy: string
  document: string | null
  observations: string | null
  signature: string | null
  date: string
  time: string
  createdAt: Date | null
}

export interface AuditLog {
  id: string
  schoolId: string | null
  userId: string
  action: string
  tableName: string
  recordId: string | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  createdAt: Date | null
}

export interface Alert {
  id: string
  schoolId: string
  studentId: string | null
  type: AlertType
  message: string
  read: boolean | null
  createdAt: Date | null
}

export interface Appointment {
  id: string
  schoolId: string
  userId: string
  title: string
  description: string | null
  startDate: Date
  endDate: Date | null
  type: string
  completed: boolean | null
  createdAt: Date | null
}

export interface DivisionWithCourse extends Division {
  course: Course
}

export interface PreceptorSchool {
  id: string
  preceptorId: string
  schoolId: string
  createdAt: Date | null
}

export interface EmployeeAttendance {
  id: string
  schoolId: string
  employeeId: string
  date: string
  status: string
  observation: string | null
  createdBy: string
  createdAt: Date | null
  updatedAt: Date | null
}

export interface EmployeeSchedule {
  id: string
  employeeId: string
  schoolId: string
  dayOfWeek: number
  timeStart: string
  timeEnd: string
}

export interface DivisionSchedule {
  id: string
  divisionId: string
  subjectId: string
  teacherId: string
  schoolId: string
  dayOfWeek: number
  timeStart: string
  timeEnd: string
}

export interface TeacherSchool {
  id: string
  teacherId: string
  schoolId: string
  deactivatedAt: Date | null
  createdAt: Date | null
}

export interface DivisionScheduleWithNames extends DivisionSchedule {
  subject: { name: string }
  teacher: { firstName: string; lastName: string } | Profile
  division: { name: string } | Division
}

export interface Grade {
  id: string
  schoolId: string
  studentId: string
  subjectId: string
  divisionId: string
  academicYearId: string
  partial1: string | null
  final1: number | null
  partial2: string | null
  final2: number | null
  updatedBy: string | null
  updatedAt: Date | null
  createdAt: Date | null
}

export type PartialGradeValue = "TEA" | "TEP" | "TED"
export type GradePeriod = "partial1" | "final1" | "partial2" | "final2"
