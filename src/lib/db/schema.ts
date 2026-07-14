import {
  pgTable,
  uuid,
  text,
  boolean,
  date,
  time,
  timestamp,
  jsonb,
  integer,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// ── Enums ──────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "school_admin",
  "director",
  "preceptor",
  "secretary",
  "teacher",
])

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "absent_justified",
  "late",
  "early_withdrawal",
])

export const bookEntryTypeEnum = pgEnum("book_entry_type", [
  "incident",
  "sanction",
  "warning",
  "phone_call",
  "interview",
  "meeting",
  "observation",
  "conduct_followup",
])

export const communicationTypeEnum = pgEnum("communication_type", [
  "whatsapp",
  "email",
])

export const documentTypeEnum = pgEnum("document_type", [
  "medical_certificate",
  "authorization",
  "dni",
  "receipt",
  "school_insurance",
  "other",
])

export const eventTypeEnum = pgEnum("event_type", [
  "act",
  "institutional",
  "holiday",
  "exam",
  "meeting",
  "report_delivery",
])

export const alertTypeEnum = pgEnum("alert_type", [
  "excessive_absences",
  "near_failing",
  "missing_documentation",
  "incomplete_data",
  "birthday",
  "pending_communication",
])

// ── Better Auth Tables ─────────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  role: text("role"),
  banned: boolean("banned"),
  banReason: text("banReason"),
  banExpires: timestamp("banExpires"),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// ── Tables ─────────────────────────────────────────────────────────────────────

export const schools = pgTable(
  "schools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    logoUrl: text("logo_url"),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("idx_schools_active").on(t.active)]
)

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id").references(() => schools.id, {
      onDelete: "set null",
    }),
    role: userRoleEnum("role").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_profiles_school_id").on(t.schoolId),
    index("idx_profiles_role").on(t.role),
    index("idx_profiles_email").on(t.email),
  ]
)

export const academicYears = pgTable(
  "academic_years",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    active: boolean("active").default(false),
  },
  (t) => [
    index("idx_academic_years_school_id").on(t.schoolId),
    index("idx_academic_years_active").on(t.active),
  ]
)

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("idx_courses_school_id").on(t.schoolId),
    index("idx_courses_academic_year_id").on(t.academicYearId),
  ]
)

export const divisions = pgTable(
  "divisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    shift: text("shift"),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    preceptorId: uuid("preceptor_id"),
  },
  (t) => [
    index("idx_divisions_school_id").on(t.schoolId),
    index("idx_divisions_course_id").on(t.courseId),
    index("idx_divisions_academic_year_id").on(t.academicYearId),
  ]
)

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("idx_subjects_school_id").on(t.schoolId),
    index("idx_subjects_academic_year_id").on(t.academicYearId),
  ]
)

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    divisionId: uuid("division_id").references(() => divisions.id, {
      onDelete: "set null",
    }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dni: text("dni").notNull().unique(),
    birthDate: date("birth_date"),
    gender: text("gender"),
    nationality: text("nationality"),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    photoUrl: text("photo_url"),
    bloodType: text("blood_type"),
    healthInsurance: text("health_insurance"),
    healthAffiliateNumber: text("health_affiliate_number"),
    doctorName: text("doctor_name"),
    doctorPhone: text("doctor_phone"),
    allergies: text("allergies"),
    medication: text("medication"),
    restrictions: text("restrictions"),
    observations: text("observations"),
    status: text("status").default("active"),
    academicYearId: uuid("academic_year_id").references(
      () => academicYears.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_students_school_id").on(t.schoolId),
    index("idx_students_division_id").on(t.divisionId),
    index("idx_students_dni").on(t.dni),
    index("idx_students_status").on(t.status),
    index("idx_students_academic_year_id").on(t.academicYearId),
  ]
)

export const studentGuardians = pgTable(
  "student_guardians",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    relationship: text("relationship").notNull(),
  },
  (t) => [index("idx_student_guardians_student_id").on(t.studentId)]
)

export const authorizedPersons = pgTable(
  "authorized_persons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    document: text("document"),
  },
  (t) => [index("idx_authorized_persons_student_id").on(t.studentId)]
)

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    status: attendanceStatusEnum("status").notNull(),
    observation: text("observation"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_attendance_school_id").on(t.schoolId),
    index("idx_attendance_student_id").on(t.studentId),
    index("idx_attendance_division_id").on(t.divisionId),
    index("idx_attendance_date").on(t.date),
    index("idx_attendance_status").on(t.status),
    index("idx_attendance_student_date").on(t.studentId, t.date),
  ]
)

export const attendanceLog = pgTable(
  "attendance_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attendanceId: uuid("attendance_id")
      .notNull()
      .references(() => attendance.id, { onDelete: "cascade" }),
    previousStatus: attendanceStatusEnum("previous_status"),
    newStatus: attendanceStatusEnum("new_status").notNull(),
    changedBy: uuid("changed_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "set null" }),
    changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_attendance_log_attendance_id").on(t.attendanceId),
    index("idx_attendance_log_changed_at").on(t.changedAt),
  ]
)

export const preceptorBook = pgTable(
  "preceptor_book",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    type: bookEntryTypeEnum("type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    studentId: uuid("student_id").references(() => students.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_preceptor_book_school_id").on(t.schoolId),
    index("idx_preceptor_book_student_id").on(t.studentId),
    index("idx_preceptor_book_type").on(t.type),
    index("idx_preceptor_book_created_at").on(t.createdAt),
  ]
)

export const communications = pgTable(
  "communications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    type: communicationTypeEnum("type").notNull(),
    message: text("message").notNull(),
    sentTo: text("sent_to").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    status: text("status").default("sent"),
  },
  (t) => [
    index("idx_communications_school_id").on(t.schoolId),
    index("idx_communications_student_id").on(t.studentId),
    index("idx_communications_type").on(t.type),
    index("idx_communications_sent_at").on(t.sentAt),
  ]
)

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: documentTypeEnum("type").notNull(),
    fileUrl: text("file_url").notNull(),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_documents_school_id").on(t.schoolId),
    index("idx_documents_student_id").on(t.studentId),
    index("idx_documents_type").on(t.type),
  ]
)

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    type: eventTypeEnum("type").notNull(),
    allDay: boolean("all_day").default(false),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_calendar_events_school_id").on(t.schoolId),
    index("idx_calendar_events_type").on(t.type),
    index("idx_calendar_events_start_date").on(t.startDate),
  ]
)

export const withdrawals = pgTable(
  "withdrawals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    withdrawnBy: text("withdrawn_by").notNull(),
    document: text("document"),
    observations: text("observations"),
    signature: text("signature"),
    date: date("date").notNull(),
    time: time("time").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_withdrawals_school_id").on(t.schoolId),
    index("idx_withdrawals_student_id").on(t.studentId),
    index("idx_withdrawals_date").on(t.date),
  ]
)

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").references(() => schools.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    tableName: text("table_name").notNull(),
    recordId: text("record_id"),
    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_audit_log_school_id").on(t.schoolId),
    index("idx_audit_log_user_id").on(t.userId),
    index("idx_audit_log_table_name").on(t.tableName),
    index("idx_audit_log_created_at").on(t.createdAt),
  ]
)

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").references(() => students.id, {
      onDelete: "cascade",
    }),
    type: alertTypeEnum("type").notNull(),
    message: text("message").notNull(),
    read: boolean("read").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_alerts_school_id").on(t.schoolId),
    index("idx_alerts_student_id").on(t.studentId),
    index("idx_alerts_type").on(t.type),
    index("idx_alerts_read").on(t.read),
  ]
)

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    type: text("type").notNull(),
    completed: boolean("completed").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_appointments_school_id").on(t.schoolId),
    index("idx_appointments_user_id").on(t.userId),
    index("idx_appointments_start_date").on(t.startDate),
  ]
)

export const teacherAssignments = pgTable(
  "teacher_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("idx_teacher_assignments_teacher_id").on(t.teacherId),
    index("idx_teacher_assignments_division_id").on(t.divisionId),
    index("idx_teacher_assignments_subject_id").on(t.subjectId),
    index("idx_teacher_assignments_school_id").on(t.schoolId),
    index("idx_teacher_assignments_academic_year_id").on(t.academicYearId),
  ]
)

export const preceptorSchools = pgTable(
  "preceptor_schools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    preceptorId: uuid("preceptor_id").notNull(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("preceptor_schools_preceptor_id_school_id_unique").on(
      t.preceptorId,
      t.schoolId
    ),
  ]
)

export const teacherSchools = pgTable(
  "teacher_schools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: uuid("teacher_id").notNull(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("teacher_schools_teacher_id_school_id_unique").on(
      t.teacherId,
      t.schoolId
    ),
  ]
)

export const employeeAttendance = pgTable(
  "employee_attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").notNull(),
    date: date("date").notNull(),
    status: text("status").notNull(),
    observation: text("observation"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_employee_attendance_school_id").on(t.schoolId),
    index("idx_employee_attendance_employee_id").on(t.employeeId),
    index("idx_employee_attendance_date").on(t.date),
  ]
)

export const employeeSchedules = pgTable(
  "employee_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id").notNull(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    timeStart: text("time_start").notNull(),
    timeEnd: text("time_end").notNull(),
  },
  (t) => [
    index("idx_employee_schedules_school_id").on(t.schoolId),
    index("idx_employee_schedules_employee_id").on(t.employeeId),
  ]
)

export const divisionSchedules = pgTable(
  "division_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    timeStart: text("time_start").notNull(),
    timeEnd: text("time_end").notNull(),
  },
  (t) => [
    index("idx_division_schedules_division_id").on(t.divisionId),
    index("idx_division_schedules_teacher_id").on(t.teacherId),
    index("idx_division_schedules_school_id").on(t.schoolId),
  ]
)

export const grades = pgTable(
  "grades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "cascade" }),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    partial1: text("partial_1"),
    final1: integer("final_1"),
    partial2: text("partial_2"),
    final2: integer("final_2"),
    updatedBy: uuid("updated_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("grades_student_subject_division_year_unique").on(
      t.studentId,
      t.subjectId,
      t.divisionId,
      t.academicYearId
    ),
  ]
)

// ── Relations ──────────────────────────────────────────────────────────────────

export const schoolsRelations = relations(schools, ({ many }) => ({
  profiles: many(profiles),
  academicYears: many(academicYears),
  courses: many(courses),
  divisions: many(divisions),
  subjects: many(subjects),
  students: many(students),
}))

export const profilesRelations = relations(profiles, ({ one }) => ({
  school: one(schools, {
    fields: [profiles.schoolId],
    references: [schools.id],
  }),
}))

export const academicYearsRelations = relations(academicYears, ({ one, many }) => ({
  school: one(schools, {
    fields: [academicYears.schoolId],
    references: [schools.id],
  }),
  courses: many(courses),
  divisions: many(divisions),
  subjects: many(subjects),
}))

export const coursesRelations = relations(courses, ({ one, many }) => ({
  school: one(schools, {
    fields: [courses.schoolId],
    references: [schools.id],
  }),
  academicYear: one(academicYears, {
    fields: [courses.academicYearId],
    references: [academicYears.id],
  }),
  divisions: many(divisions),
}))

export const divisionsRelations = relations(divisions, ({ one, many }) => ({
  school: one(schools, {
    fields: [divisions.schoolId],
    references: [schools.id],
  }),
  course: one(courses, {
    fields: [divisions.courseId],
    references: [courses.id],
  }),
  academicYear: one(academicYears, {
    fields: [divisions.academicYearId],
    references: [academicYears.id],
  }),
  students: many(students),
}))

export const studentsRelations = relations(students, ({ one, many }) => ({
  school: one(schools, {
    fields: [students.schoolId],
    references: [schools.id],
  }),
  division: one(divisions, {
    fields: [students.divisionId],
    references: [divisions.id],
  }),
  guardians: many(studentGuardians),
  authorizedPersons: many(authorizedPersons),
  attendance: many(attendance),
}))

export const studentGuardiansRelations = relations(studentGuardians, ({ one }) => ({
  student: one(students, {
    fields: [studentGuardians.studentId],
    references: [students.id],
  }),
}))

export const authorizedPersonsRelations = relations(authorizedPersons, ({ one }) => ({
  student: one(students, {
    fields: [authorizedPersons.studentId],
    references: [students.id],
  }),
}))

export const attendanceRelations = relations(attendance, ({ one }) => ({
  school: one(schools, {
    fields: [attendance.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [attendance.studentId],
    references: [students.id],
  }),
  division: one(divisions, {
    fields: [attendance.divisionId],
    references: [divisions.id],
  }),
  creator: one(profiles, {
    fields: [attendance.createdBy],
    references: [profiles.id],
  }),
}))

export const preceptorBookRelations = relations(preceptorBook, ({ one }) => ({
  school: one(schools, {
    fields: [preceptorBook.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [preceptorBook.studentId],
    references: [students.id],
  }),
  creator: one(profiles, {
    fields: [preceptorBook.createdBy],
    references: [profiles.id],
  }),
}))

export const communicationsRelations = relations(communications, ({ one }) => ({
  school: one(schools, {
    fields: [communications.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [communications.studentId],
    references: [students.id],
  }),
}))

export const documentsRelations = relations(documents, ({ one }) => ({
  school: one(schools, {
    fields: [documents.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [documents.studentId],
    references: [students.id],
  }),
  uploader: one(profiles, {
    fields: [documents.uploadedBy],
    references: [profiles.id],
  }),
}))

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  school: one(schools, {
    fields: [calendarEvents.schoolId],
    references: [schools.id],
  }),
  creator: one(profiles, {
    fields: [calendarEvents.createdBy],
    references: [profiles.id],
  }),
}))

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  school: one(schools, {
    fields: [withdrawals.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [withdrawals.studentId],
    references: [students.id],
  }),
}))

export const alertsRelations = relations(alerts, ({ one }) => ({
  school: one(schools, {
    fields: [alerts.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [alerts.studentId],
    references: [students.id],
  }),
}))

export const divisionSchedulesRelations = relations(divisionSchedules, ({ one }) => ({
  division: one(divisions, {
    fields: [divisionSchedules.divisionId],
    references: [divisions.id],
  }),
  subject: one(subjects, {
    fields: [divisionSchedules.subjectId],
    references: [subjects.id],
  }),
  teacher: one(profiles, {
    fields: [divisionSchedules.teacherId],
    references: [profiles.id],
  }),
  school: one(schools, {
    fields: [divisionSchedules.schoolId],
    references: [schools.id],
  }),
}))

export const teacherAssignmentsRelations = relations(teacherAssignments, ({ one }) => ({
  teacher: one(profiles, {
    fields: [teacherAssignments.teacherId],
    references: [profiles.id],
  }),
  division: one(divisions, {
    fields: [teacherAssignments.divisionId],
    references: [divisions.id],
  }),
  subject: one(subjects, {
    fields: [teacherAssignments.subjectId],
    references: [subjects.id],
  }),
  school: one(schools, {
    fields: [teacherAssignments.schoolId],
    references: [schools.id],
  }),
  academicYear: one(academicYears, {
    fields: [teacherAssignments.academicYearId],
    references: [academicYears.id],
  }),
}))

export const employeeSchedulesRelations = relations(employeeSchedules, ({ one }) => ({
  school: one(schools, {
    fields: [employeeSchedules.schoolId],
    references: [schools.id],
  }),
}))

export const employeeAttendanceRelations = relations(employeeAttendance, ({ one }) => ({
  school: one(schools, {
    fields: [employeeAttendance.schoolId],
    references: [schools.id],
  }),
  creator: one(profiles, {
    fields: [employeeAttendance.createdBy],
    references: [profiles.id],
  }),
}))

export const gradesRelations = relations(grades, ({ one }) => ({
  school: one(schools, {
    fields: [grades.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [grades.studentId],
    references: [students.id],
  }),
  subject: one(subjects, {
    fields: [grades.subjectId],
    references: [subjects.id],
  }),
  division: one(divisions, {
    fields: [grades.divisionId],
    references: [divisions.id],
  }),
  academicYear: one(academicYears, {
    fields: [grades.academicYearId],
    references: [academicYears.id],
  }),
  updater: one(profiles, {
    fields: [grades.updatedBy],
    references: [profiles.id],
  }),
}))

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  school: one(schools, {
    fields: [appointments.schoolId],
    references: [schools.id],
  }),
  user: one(profiles, {
    fields: [appointments.userId],
    references: [profiles.id],
  }),
}))
