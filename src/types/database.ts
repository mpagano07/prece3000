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
  logo_url: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  school_id: string | null
  role: Role
  first_name: string
  last_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface AcademicYear {
  id: string
  school_id: string
  name: string
  start_date: string
  end_date: string
  active: boolean
}

export interface Course {
  id: string
  school_id: string
  name: string
  academic_year_id: string
}

export interface Division {
  id: string
  school_id: string
  course_id: string
  name: string
  shift: string | null
  academic_year_id: string
  preceptor_id: string | null
}

export interface Subject {
  id: string
  school_id: string
  name: string
  academic_year_id: string
}

export interface Student {
  id: string
  school_id: string
  division_id: string | null
  first_name: string
  last_name: string
  dni: string
  birth_date: string | null
  gender: string | null
  nationality: string | null
  address: string | null
  phone: string | null
  email: string | null
  photo_url: string | null
  blood_type: string | null
  health_insurance: string | null
  health_affiliate_number: string | null
  doctor_name: string | null
  doctor_phone: string | null
  allergies: string | null
  medication: string | null
  restrictions: string | null
  observations: string | null
  status: string
  academic_year_id: string | null
  created_at: string
  updated_at: string
}

export interface StudentGuardian {
  id: string
  student_id: string
  name: string
  phone: string | null
  email: string | null
  relationship: string
}

export interface AuthorizedPerson {
  id: string
  student_id: string
  name: string
  phone: string | null
  document: string | null
}

export interface Attendance {
  id: string
  school_id: string
  student_id: string
  division_id: string
  date: string
  status: AttendanceStatus
  observation: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface AttendanceLog {
  id: string
  attendance_id: string
  previous_status: AttendanceStatus | null
  new_status: AttendanceStatus
  changed_by: string
  changed_at: string
}

export interface PreceptorBookEntry {
  id: string
  school_id: string
  type: BookEntryType
  title: string
  description: string
  student_id: string | null
  created_by: string
  created_at: string
}

export interface Communication {
  id: string
  school_id: string
  student_id: string
  type: CommunicationType
  message: string
  sent_to: string
  sent_at: string
  status: string
}

export interface Document {
  id: string
  school_id: string
  student_id: string
  name: string
  type: DocumentType
  file_url: string
  uploaded_by: string
  uploaded_at: string
}

export interface CalendarEvent {
  id: string
  school_id: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  type: EventType
  all_day: boolean
  created_by: string
  created_at: string
}

export interface Withdrawal {
  id: string
  school_id: string
  student_id: string
  withdrawn_by: string
  document: string | null
  observations: string | null
  signature: string | null
  date: string
  time: string
  created_at: string
}

export interface AuditLog {
  id: string
  school_id: string | null
  user_id: string
  action: string
  table_name: string
  record_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
}

export interface Alert {
  id: string
  school_id: string
  student_id: string | null
  type: AlertType
  message: string
  read: boolean
  created_at: string
}

export interface Appointment {
  id: string
  school_id: string
  user_id: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  type: string
  created_at: string
}

export interface DivisionWithCourse extends Division {
  course: Course
}

export interface PreceptorSchool {
  id: string
  preceptor_id: string
  school_id: string
  created_at: string
}

export interface EmployeeAttendance {
  id: string
  school_id: string
  employee_id: string
  date: string
  status: EmployeeAttendanceStatus
  observation: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface EmployeeSchedule {
  id: string
  employee_id: string
  school_id: string
  day_of_week: number
  time_start: string
  time_end: string
}
