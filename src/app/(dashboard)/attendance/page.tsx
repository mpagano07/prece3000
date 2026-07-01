"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  ClipboardCheck,
  Calendar,
  Users,
  GraduationCap,
  ListChecks,
} from "lucide-react"
import { formatDate, cn } from "@/lib/utils"
import { ATTENDANCE_STATUS } from "@/lib/constants"
import { useAuth } from "@/contexts/auth-context"
import { useCourses, useDivisions } from "@/hooks/use-courses"
import { useAttendanceReport } from "@/hooks/use-attendance"
import { useStudents } from "@/hooks/use-students"
import { PageHeader } from "@/components/shared/page-header"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function AttendancePage() {
  const router = useRouter()
  const { isLoading: authLoading } = useAuth()
  const today = format(new Date(), "yyyy-MM-dd")

  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [selectedDivisionId, setSelectedDivisionId] = useState("")
  const [selectedDate, setSelectedDate] = useState(today)

  const { data: courses, isLoading: coursesLoading } = useCourses()
  const { data: divisions, isLoading: divisionsLoading } = useDivisions(
    selectedCourseId
  )
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const { data: report, isLoading: reportLoading } = useAttendanceReport(
    selectedDivisionId,
    currentYear,
    currentMonth
  )
  const { data: students } =
    useStudents(selectedDivisionId)

  const selectedDivision = useMemo(
    () => divisions?.find((d) => d.id === selectedDivisionId),
    [divisions, selectedDivisionId]
  )

  const handleTakeAttendance = () => {
    if (!selectedCourseId || !selectedDivisionId) return
    router.push(
      `/attendance/${selectedCourseId}?division=${selectedDivisionId}&date=${selectedDate}`
    )
  }

  const stats = useMemo(() => {
    if (!report || report.length === 0) return null
    const todayStr = format(new Date(), "yyyy-MM-dd")
    const todayReport = report.find((r) => r.date === todayStr)
    if (!todayReport) return null
    const totalStudents = students?.length ?? 0
    const marked =
      todayReport.present +
      todayReport.absent +
      todayReport.absent_justified +
      todayReport.late +
      todayReport.early_withdrawal
    return { ...todayReport, totalStudents, marked }
  }, [report, students])

  const recentSessions = useMemo(() => {
    if (!report) return []
    return [...report]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10)
  }, [report])

  if (authLoading) return <LoadingScreen />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asistencia"
        description="Registre y consulte la asistencia de los estudiantes"
      />

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar División</CardTitle>
          <CardDescription>
            Elija el curso y la división para registrar asistencia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Curso</label>
              <Select
                value={selectedCourseId}
                onValueChange={(v) => {
                  setSelectedCourseId(v ?? "")
                  setSelectedDivisionId("")
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar curso" />
                </SelectTrigger>
                <SelectContent>
                  {courses?.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">División</label>
              <Select
                value={selectedDivisionId}
                onValueChange={(v) => setSelectedDivisionId(v ?? "")}
                disabled={!selectedCourseId || divisionsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar división" />
                </SelectTrigger>
                <SelectContent>
                  {divisions?.map((div) => (
                    <SelectItem key={div.id} value={div.id}>
                      {div.name}
                      {div.shift && ` (${div.shift})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-44 space-y-2">
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <Button
              onClick={handleTakeAttendance}
              disabled={!selectedDivisionId}
              className="w-full sm:w-auto"
            >
              <ClipboardCheck />
              Tomar Asistencia
            </Button>
          </div>
        </CardContent>
      </Card>

      {stats && selectedDivisionId && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                Alumnos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalStudents}</p>
              <p className="text-xs text-muted-foreground">
                {stats.marked} marcados hoy
              </p>
            </CardContent>
          </Card>

          {ATTENDANCE_STATUS.map((s) => {
            const count = stats[s.value as keyof typeof stats] as number
            return (
              <Card key={s.value} size="sm">
                <CardHeader>
                  <CardTitle className={cn("flex items-center gap-2", s.color)}>
                    <ListChecks className="size-4" />
                    {s.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{count ?? 0}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {!selectedDivisionId && !coursesLoading && (
        <EmptyState
          icon={<GraduationCap className="size-12" />}
          title="Seleccione una división"
          description="Elija un curso y una división para comenzar a registrar asistencia"
        />
      )}

      {selectedDivisionId && recentSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-4" />
              Sesiones Recientes
            </CardTitle>
            <CardDescription>
              Últimas fechas con asistencia registrada en {selectedDivision?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    {ATTENDANCE_STATUS.map((s) => (
                      <TableHead key={s.value} className="text-center">
                        <span className={cn("text-xs", s.color)}>{s.label}</span>
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSessions.map((session) => {
                    const total =
                      session.present +
                      session.absent +
                      session.absent_justified +
                      session.late +
                      session.early_withdrawal
                    return (
                      <TableRow key={session.date}>
                        <TableCell className="font-medium">
                          {formatDate(session.date)}
                        </TableCell>
                        {ATTENDANCE_STATUS.map((s) => (
                          <TableCell key={s.value} className="text-center">
                            {session[s.value as keyof typeof session]}
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-medium">
                          {total}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedDivisionId && recentSessions.length === 0 && !reportLoading && (
        <EmptyState
          icon={<Calendar className="size-12" />}
          title="Sin registros"
          description={`No hay asistencia registrada para ${selectedDivision?.name} en ${format(new Date(), "MMMM 'de' yyyy")}`}
        />
      )}
    </div>
  )
}
