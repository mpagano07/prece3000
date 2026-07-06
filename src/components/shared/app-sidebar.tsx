"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import type { Role } from "@/types/database"
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  Notebook,
  GraduationCap,
  Presentation,
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  Shield,
  UserCog,
  ClipboardCheck,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: Role[]
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard, roles: ["super_admin", "school_admin", "director", "preceptor", "secretary", "teacher"] },
  { href: "/students", label: "Alumnos", icon: Users, roles: ["super_admin", "school_admin", "director", "preceptor", "secretary", "teacher"] },
  { href: "/book", label: "Libro de Preceptor", icon: BookOpen, roles: ["super_admin", "preceptor"] },
  { href: "/calendar", label: "Calendario", icon: Calendar, roles: ["super_admin", "school_admin", "director", "preceptor", "secretary", "teacher"] },
  { href: "/agenda", label: "Agenda", icon: Notebook, roles: ["super_admin", "preceptor"] },
  { href: "/attendance", label: "Asistencia Personal", icon: ClipboardCheck, roles: ["super_admin", "school_admin", "director", "secretary"] },
  { href: "/courses", label: "Cursos", icon: GraduationCap, roles: ["super_admin", "school_admin", "director", "preceptor", "teacher"] },
  { href: "/teachers", label: "Docentes", icon: Presentation, roles: ["super_admin", "school_admin", "director"] },
  { href: "/grades", label: "Calificaciones", icon: ClipboardCheck, roles: ["super_admin", "school_admin", "director", "preceptor", "secretary", "teacher"] },
  { href: "/communications", label: "Comunicaciones", icon: MessageSquare, roles: ["super_admin", "school_admin", "director", "preceptor", "secretary", "teacher"] },
  { href: "/documents", label: "Documentos", icon: FileText, roles: ["super_admin", "school_admin", "director", "preceptor", "secretary"] },
  { href: "/reports", label: "Reportes", icon: BarChart3, roles: ["super_admin", "school_admin", "director", "secretary"] },
  { href: "/settings", label: "Configuración", icon: Settings, roles: ["super_admin", "school_admin", "director"] },
  { href: "/admin/users", label: "Usuarios", icon: UserCog, roles: ["super_admin"] },
  { href: "/admin/schools", label: "Escuelas", icon: Shield, roles: ["super_admin"] },
]

interface AppSidebarProps {
  onClose?: () => void
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const pathname = usePathname()
  const { profile, school } = useAuth()
  const role = profile?.role

  const filteredItems = navItems.filter(
    (item) => !role || item.roles.includes(role)
  )

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
          {school?.name?.charAt(0) ?? "E"}
        </div>
        <div className="flex-1 truncate text-sm font-medium">
          {school?.name ?? "ElPrece"}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="-mr-1">
            <X className="size-4" />
            <span className="sr-only">Cerrar</span>
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="flex flex-col gap-0.5">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/")

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3">
        <Separator className="mb-3" />
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
            {profile?.first_name?.charAt(0) ?? "U"}
            {profile?.last_name?.charAt(0) ?? ""}
          </div>
          <div className="flex-1 truncate text-xs">
            <p className="font-medium">
              {profile?.first_name ?? "Usuario"} {profile?.last_name ?? ""}
            </p>
            <p className="text-sidebar-foreground/50 capitalize">{role?.replace("_", " ") ?? ""}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
