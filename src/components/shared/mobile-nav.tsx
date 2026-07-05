"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, BookOpen, ClipboardCheck, Settings } from "lucide-react"

const mobileItems = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/students", label: "Alumnos", icon: Users },
  { href: "/courses", label: "Cursos", icon: BookOpen },
  { href: "/grades", label: "Calificaciones", icon: ClipboardCheck },
  { href: "/settings", label: "Ajustes", icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t bg-background lg:hidden">
      {mobileItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/80"
            )}
          >
            <Icon className="size-5" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
