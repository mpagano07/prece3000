"use client"

import {
  useDashboardStats,
  useDashboardBirthdays,
  useDashboardAlerts,
  useUpcomingEvents,
  useNearFailingStudents,
} from "@/hooks/use-dashboard"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  UserCheck,
  UserX,
  Clock,
  LogOut,
  Cake,
  Bell,
  Calendar,
  AlertTriangle,
  GraduationCap,
} from "lucide-react"
import { getInitials, formatDate } from "@/lib/utils"
import type { Alert } from "@/types/database"

const statusConfig: Record<
  string,
  { label: string; icon: typeof UserCheck; color: string; bg: string }
> = {
  present: {
    label: "Presentes",
    icon: UserCheck,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/20",
  },
  absent: {
    label: "Ausentes",
    icon: UserX,
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900/20",
  },
  late: {
    label: "Tardanzas",
    icon: Clock,
    color: "text-orange-600",
    bg: "bg-orange-100 dark:bg-orange-900/20",
  },
  early_withdrawal: {
    label: "Retiros",
    icon: LogOut,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/20",
  },
}

function AlertIcon({ type }: { type: Alert["type"] }) {
  switch (type) {
    case "excessive_absences":
      return <UserX className="size-4 text-red-500" />
    case "near_failing":
      return <GraduationCap className="size-4 text-orange-500" />
    case "missing_documentation":
      return <AlertTriangle className="size-4 text-yellow-500" />
    case "birthday":
      return <Cake className="size-4 text-pink-500" />
    case "pending_communication":
      return <Bell className="size-4 text-blue-500" />
    default:
      return <Bell className="size-4 text-muted-foreground" />
  }
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats()
  const { data: birthdays, isLoading: birthdaysLoading } = useDashboardBirthdays()
  const { data: alerts, isLoading: alertsLoading } = useDashboardAlerts()
  const { data: events, isLoading: eventsLoading } = useUpcomingEvents()
  const { data: nearFailing, isLoading: nearFailingLoading } = useNearFailingStudents()

  if (statsLoading || birthdaysLoading || alertsLoading || eventsLoading || nearFailingLoading) {
    return <LoadingScreen />
  }

  if (statsError) {
    console.error("Dashboard stats error:", statsError)
  }

  const statCards = [
    { key: "present", value: stats?.present ?? 0 },
    { key: "absent", value: stats?.absent ?? 0 },
    { key: "late", value: stats?.late ?? 0 },
    { key: "early_withdrawal", value: stats?.early_withdrawal ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen de asistencia del día</p>
        {statsError && (
          <p className="mt-1 text-xs text-red-500">Error: {(statsError as Error).message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ key, value }) => {
          const cfg = statusConfig[key]
          const Icon = cfg.icon
          return (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{cfg.label}</CardTitle>
                  <div className={`rounded-lg p-2 ${cfg.bg}`}>
                    <Icon className={`size-5 ${cfg.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="size-4 text-orange-500" />
              Próximos a quedar libres
            </CardTitle>
            <CardDescription>
              Alumnos con menos del 75% de asistencia
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!nearFailing || nearFailing.length === 0 ? (
              <EmptyState
                title="Sin alumnos en riesgo"
                description="No hay alumnos próximos a quedar libres"
              />
            ) : (
              <div className="space-y-3">
                {nearFailing.slice(0, 10).map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        {student.photo_url && (
                          <AvatarImage src={student.photo_url} />
                        )}
                        <AvatarFallback>
                          {getInitials(student.first_name, student.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {student.last_name}, {student.first_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {student.absenceCount} inasistencias
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        student.attendancePercentage < 60
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {student.attendancePercentage}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cake className="size-4 text-pink-500" />
              Cumpleaños del día
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!birthdays || birthdays.length === 0 ? (
              <EmptyState
                title="Sin cumpleaños hoy"
                description="No hay alumnos que cumplan años hoy"
              />
            ) : (
              <div className="space-y-3">
                {birthdays.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3"
                  >
                    <Avatar size="sm">
                      {student.photo_url && (
                        <AvatarImage src={student.photo_url} />
                      )}
                      <AvatarFallback>
                        {getInitials(student.first_name, student.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.division_id ?? "Sin división"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-4 text-amber-500" />
              Alertas
            </CardTitle>
            <CardDescription>
              {alerts?.length ?? 0} alertas sin leer
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!alerts || alerts.length === 0 ? (
              <EmptyState
                title="Sin alertas"
                description="No hay alertas pendientes"
              />
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 10).map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <AlertIcon type={alert.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(alert.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-4 text-blue-500" />
              Próximos eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!events || events.length === 0 ? (
              <EmptyState
                title="Sin eventos"
                description="No hay eventos próximos"
              />
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="flex min-w-10 flex-col items-center rounded-lg border bg-muted/50 p-1.5">
                      <span className="text-xs font-bold">
                        {new Date(event.start_date).getDate()}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(event.start_date).toLocaleString("es-AR", {
                          month: "short",
                        })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
