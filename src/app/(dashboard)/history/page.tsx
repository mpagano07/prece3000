"use client"

import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { PageHeader } from "@/components/shared/page-header"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  ShieldAlert,
  Users,
  ClipboardCheck,
  GraduationCap,
} from "lucide-react"
import { getAttendanceWithStudents, getEmployeeAttendanceHistory } from "@/services/attendance"
import { getGradesWithStudents } from "@/services/grades"

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  present: "Presente",
  absent: "Ausente",
  absent_justified: "Ausente Justif.",
  late: "Tarde",
  early_withdrawal: "Retiro Anticipado",
}

const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  present:
    "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400",
  absent:
    "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400",
  absent_justified:
    "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400",
  late:
    "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400",
  early_withdrawal:
    "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400",
}

const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  present: "Presente",
  absent: "Ausente",
  late: "Tardanza",
  justified_absence: "Ausencia Justif.",
}

const EMPLOYEE_STATUS_COLORS: Record<string, string> = {
  present:
    "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400",
  absent:
    "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400",
  late:
    "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400",
  justified_absence:
    "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400",
}

function StudentAttendanceHistory({ schoolId }: { schoolId?: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["history", "student-attendance", schoolId],
    queryFn: () => getAttendanceWithStudents(schoolId!),
    enabled: !!schoolId,
  })

  if (isLoading) return <LoadingScreen />

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardCheck className="size-12" />}
        title="Sin registros"
        description="No hay asistencias de alumnos registradas."
      />
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Alumno</TableHead>
            <TableHead>DNI</TableHead>
            <TableHead>División</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Marcado por</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="text-xs tabular-nums">
                {format(new Date(record.date), "dd/MM/yyyy")}
              </TableCell>
              <TableCell className="text-xs font-medium">
                {record.student?.lastName}, {record.student?.firstName}
              </TableCell>
              <TableCell className="text-xs tabular-nums">
                {record.student?.dni}
              </TableCell>
              <TableCell className="text-xs">{record.division?.name}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    ATTENDANCE_STATUS_COLORS[record.status] ?? ""
                  }`}
                >
                  {ATTENDANCE_STATUS_LABELS[record.status] ?? record.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {record.creator
                  ? `${record.creator.lastName}, ${record.creator.firstName}`
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function EmployeeAttendanceHistory({ schoolId }: { schoolId?: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["history", "employee-attendance", schoolId],
    queryFn: () => getEmployeeAttendanceHistory(schoolId!),
    enabled: !!schoolId,
  })

  if (isLoading) return <LoadingScreen />

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<Users className="size-12" />}
        title="Sin registros"
        description="No hay asistencias del personal registradas."
      />
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Empleado</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Marcado por</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="text-xs tabular-nums">
                {format(new Date(record.date), "dd/MM/yyyy")}
              </TableCell>
              <TableCell className="text-xs font-medium">
                {record.employee
                  ? `${record.employee.lastName}, ${record.employee.firstName}`
                  : "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    EMPLOYEE_STATUS_COLORS[record.status] ?? ""
                  }`}
                >
                  {EMPLOYEE_STATUS_LABELS[record.status] ?? record.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {record.creator
                  ? `${record.creator.lastName}, ${record.creator.firstName}`
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function GradesHistory({ schoolId }: { schoolId?: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["history", "grades", schoolId],
    queryFn: () => getGradesWithStudents(schoolId!),
    enabled: !!schoolId,
  })

  if (isLoading) return <LoadingScreen />

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<GraduationCap className="size-12" />}
        title="Sin registros"
        description="No hay cargas de notas registradas."
      />
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Alumno</TableHead>
            <TableHead>Materia</TableHead>
            <TableHead className="text-center">P1</TableHead>
            <TableHead className="text-center">F1</TableHead>
            <TableHead className="text-center">P2</TableHead>
            <TableHead className="text-center">F2</TableHead>
            <TableHead>Cargado por</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="text-xs tabular-nums">
                {record.updatedAt ? format(record.updatedAt, "dd/MM/yyyy HH:mm") : "—"}
              </TableCell>
              <TableCell className="text-xs font-medium">
                {record.student?.lastName}, {record.student?.firstName}
              </TableCell>
              <TableCell className="text-xs">{record.subject?.name}</TableCell>
              <TableCell className="text-center text-xs tabular-nums">
                {record.partial1 ?? "—"}
              </TableCell>
              <TableCell className="text-center text-xs tabular-nums">
                {record.final1 != null ? record.final1 : "—"}
              </TableCell>
              <TableCell className="text-center text-xs tabular-nums">
                {record.partial2 ?? "—"}
              </TableCell>
              <TableCell className="text-center text-xs tabular-nums">
                {record.final2 != null ? record.final2 : "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {record.updater
                  ? `${record.updater.lastName}, ${record.updater.firstName}`
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default function HistoryPage() {
  const { profile, school } = useAuth()

  const canAccess =
    profile?.role === "super_admin" || profile?.role === "director"

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="mb-4 size-12 text-muted-foreground" />
        <h3 className="text-sm font-medium">Acceso restringido</h3>
        <p className="text-xs text-muted-foreground">
          Solo super administradores y directores pueden ver los historiales.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historiales"
        description="Registro de quién marcó asistencias y cargó notas"
      />

      <Tabs defaultValue="student-attendance">
        <TabsList>
          <TabsTrigger value="student-attendance">
            Asistencia de Alumnos
          </TabsTrigger>
          <TabsTrigger value="employee-attendance">
            Asistencia del Personal
          </TabsTrigger>
          <TabsTrigger value="grades">Carga de Notas</TabsTrigger>
        </TabsList>

        <TabsContent value="student-attendance" className="pt-4">
          <StudentAttendanceHistory schoolId={school?.id} />
        </TabsContent>

        <TabsContent value="employee-attendance" className="pt-4">
          <EmployeeAttendanceHistory schoolId={school?.id} />
        </TabsContent>

        <TabsContent value="grades" className="pt-4">
          <GradesHistory schoolId={school?.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
