"use client"

import { useState, useEffect, useMemo } from "react"
import { format } from "date-fns"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ClipboardCheck,
  Loader2,
  Users,
  ShieldAlert,
  Save,
  Search,
  Settings2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { authClient } from "@/lib/auth-client"
import { getProfilesBySchoolAndRoles } from "@/services/profiles"
import {
  getEmployeeAttendanceByDate,
  hasSchedulesForSchool,
  getScheduledIdsForDay,
} from "@/services/attendance"
import { PageHeader } from "@/components/shared/page-header"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
} from "@/components/ui/card"
import { ScheduleConfigDialog } from "@/components/employee/schedule-config-dialog"
import type { Profile, EmployeeAttendanceStatus } from "@/types/database"

const STATUS_CONFIG: Record<EmployeeAttendanceStatus, { label: string; color: string }> = {
  present: {
    label: "Presente",
    color: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400",
  },
  absent: {
    label: "Ausente",
    color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400",
  },
  late: {
    label: "Tardanza",
    color: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400",
  },
  justified_absence: {
    label: "Ausencia Justif.",
    color: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
}

export default function EmployeeAttendancePage() {
  const { profile, school } = useAuth()
  const queryClient = useQueryClient()
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [searchQuery, setSearchQuery] = useState("")
  const [attendanceMap, setAttendanceMap] = useState<Record<string, EmployeeAttendanceStatus | "">>({})
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)

  const today = format(new Date(), "yyyy-MM-dd")
  const isPastDate = date < today

  const canAccess =
    profile?.role === "super_admin" ||
    profile?.role === "school_admin" ||
    profile?.role === "director" ||
    profile?.role === "secretary"

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees", school?.id],
    queryFn: async () => {
      const rows = await getProfilesBySchoolAndRoles(school!.id, ["teacher", "preceptor", "secretary"])
      return rows.map((r) => ({
        ...r,
        first_name: r.firstName,
        last_name: r.lastName,
        school_id: r.schoolId,
        avatar_url: r.avatarUrl,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
        deactivated_at: r.deactivatedAt,
      }))
    },
    enabled: !!school?.id && canAccess,
  })

  const { data: existingRecords } = useQuery({
    queryKey: ["employee-attendance", school?.id, date],
    queryFn: async () => {
      const rows = await getEmployeeAttendanceByDate(school!.id, date)
      return rows.map((r) => ({
        ...r,
        employee_id: r.employeeId,
        school_id: r.schoolId,
        created_by: r.createdBy,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      }))
    },
    enabled: !!school?.id && canAccess,
  })

  const { data: hasSchedules } = useQuery({
    queryKey: ["has-schedules", school?.id],
    queryFn: () => hasSchedulesForSchool(school!.id),
    enabled: !!school?.id && canAccess,
  })

  const { data: schedulesSet } = useQuery({
    queryKey: ["employee-schedules", school?.id, date],
    queryFn: async () => {
      const [y, m, d] = date.split("-").map(Number)
      const dayOfWeek = new Date(y, m - 1, d).getDay()
      return getScheduledIdsForDay(school!.id, dayOfWeek)
    },
    enabled: !!school?.id && canAccess,
  })

  const scheduledEmployees = useMemo(() => {
    if (!employees) return []
    if (hasSchedules === false) return employees
    if (!schedulesSet) return employees
    return employees.filter((e) => schedulesSet.has(e.id))
  }, [employees, hasSchedules, schedulesSet])

  useEffect(() => {
    if (existingRecords && employees) {
      setAttendanceMap((prev) => {
        const map = { ...prev }
        for (const emp of employees) {
          const existing = existingRecords.find((r) => r.employeeId === emp.id)
          if (existing) {
            map[emp.id] = existing.status as EmployeeAttendanceStatus
          } else if (!(emp.id in map)) {
            map[emp.id] = ""
          }
        }
        return map
      })
    }
  }, [existingRecords, employees])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const sessionResult = await authClient.getSession()
      if (!sessionResult.data?.user) throw new Error("No autenticado")
      const userId = sessionResult.data.user.id

      const entries = Object.entries(attendanceMap)
        .filter(([, status]) => status !== "")
        .map(([employee_id, status]) => ({
          school_id: school!.id,
          employee_id,
          date,
          status: status as EmployeeAttendanceStatus,
          created_by: userId,
        }))

      if (entries.length === 0) {
        throw new Error("No hay registros para guardar")
      }

      const res = await fetch("/api/employee-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, school_id: school!.id, records: entries }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success("Asistencia guardada correctamente")
      queryClient.invalidateQueries({ queryKey: ["employee-attendance", school?.id, date] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al guardar asistencia")
    },
  })

  const scheduledIdSet = useMemo(
    () => new Set(scheduledEmployees?.map((e) => e.id) ?? []),
    [scheduledEmployees]
  )

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="mb-4 size-12 text-muted-foreground" />
        <h3 className="text-sm font-medium">Acceso restringido</h3>
        <p className="text-xs text-muted-foreground">
          Solo secretarios y directivos pueden gestionar la asistencia del personal.
        </p>
      </div>
    )
  }

  if (isLoading) return <LoadingScreen />

  const filteredEmployees = searchQuery.trim()
    ? scheduledEmployees?.filter(
        (e) =>
          e.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.lastName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : scheduledEmployees

  const total = scheduledEmployees?.length ?? 0
  const marked = Object.entries(attendanceMap).filter(
    ([id, s]) => scheduledIdSet.has(id) && s !== ""
  ).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asistencia del Personal"
        description="Registrá la asistencia de docentes, preceptores y secretarios"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Total esperado</p>
            <p className="text-xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Presentes</p>
            <p className="text-xl font-bold text-green-600">
              {existingRecords?.filter((r) => r.status === "present" && scheduledIdSet.has(r.employeeId)).length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Ausentes</p>
            <p className="text-xl font-bold text-red-600">
              {existingRecords?.filter((r) => r.status === "absent" && scheduledIdSet.has(r.employeeId)).length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Sin registrar</p>
            <p className="text-xl font-bold text-muted-foreground">{total - marked}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-4">
          <div className="space-y-1">
            <Label className="text-xs">Fecha</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 w-[160px]"
            />
          </div>
          <div className="flex-1 space-y-1 min-w-[200px]">
            <Label className="text-xs">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar personal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-7"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setScheduleDialogOpen(true)}
            >
              <Settings2 className="size-3.5" />
              <span className="hidden sm:inline">Horarios</span>
            </Button>
            {isPastDate ? (
              existingRecords && (
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { status: "present" as const, label: "Presentes" },
                    { status: "absent" as const, label: "Ausentes" },
                    { status: "late" as const, label: "Tardanzas" },
                    { status: "justified_absence" as const, label: "Aus. Justif." },
                  ]).map(({ status, label }) => {
                    const count = existingRecords.filter((r) => r.status === status).length
                    if (count === 0) return null
                    return (
                      <Badge key={status} variant="secondary" className={cn("text-xs", STATUS_CONFIG[status].color)}>
                        {count} {label}
                      </Badge>
                    )
                  })}
                </div>
              )
            ) : (
              <>
                <Badge variant="secondary" className="text-xs">
                  {marked}/{total} marcados
                </Badge>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || marked === 0}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Guardar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {!employees || employees.length === 0 ? (
        <EmptyState
          icon={<Users className="size-12" />}
          title="Sin personal"
          description="No hay docentes, preceptores o secretarios registrados en esta institución."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees?.map((emp) => {
            const currentStatus = attendanceMap[emp.id] ?? ""
            const roleLabel =
              emp.role === "teacher"
                ? "Docente"
                : emp.role === "preceptor"
                  ? "Preceptor"
                  : "Secretario"

            return (
              <Card key={emp.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="text-xs">
                        {emp.firstName?.charAt(0) ?? "?"}
                        {emp.lastName?.charAt(0) ?? ""}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <CardTitle className="text-sm truncate">
                        {emp.lastName}, {emp.firstName}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{roleLabel}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isPastDate ? (
                    currentStatus ? (
                      <Badge
                        variant="outline"
                        className={cn("w-full justify-center text-xs py-1", STATUS_CONFIG[currentStatus]?.color)}
                      >
                        {STATUS_CONFIG[currentStatus]?.label}
                      </Badge>
                    ) : (
                      <p className="text-center text-xs text-muted-foreground py-1">Sin registro</p>
                    )
                  ) : (
                    <Select
                      value={currentStatus}
                      onValueChange={(v) => {
                        const value = v as EmployeeAttendanceStatus | ""
                        setAttendanceMap((prev) => ({ ...prev, [emp.id]: value }))
                      }}
                    >
                      <SelectTrigger
                        className={cn(
                          "w-full text-xs",
                          currentStatus && STATUS_CONFIG[currentStatus]?.color
                        )}
                      >
                        <SelectValue placeholder="Sin registro" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(STATUS_CONFIG) as [EmployeeAttendanceStatus, typeof STATUS_CONFIG['present']][]).map(
                          ([status, config]) => (
                            <SelectItem key={status} value={status}>
                              <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", config.color)}>
                                {config.label}
                              </span>
                            </SelectItem>
                          )
                        )}
                        {currentStatus && (
                          <SelectItem value="">
                            <span className="text-xs text-muted-foreground">Quitar registro</span>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <ScheduleConfigDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
      />
    </div>
  )
}
