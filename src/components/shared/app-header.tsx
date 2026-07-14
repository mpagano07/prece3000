"use client"

import { useTheme } from "@/contexts/theme-context"
import { Moon, Sun, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SchoolSwitcher } from "@/components/shared/school-switcher"

interface AppHeaderProps {
  onMenuClick: () => void
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const { theme, setTheme } = useTheme()
  const { profile, school, signOut } = useAuth()

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4">
      <Button
        variant="ghost"
        size="icon-sm"
        className="-ml-1 lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="size-4" />
        <span className="sr-only">Menú</span>
      </Button>

      <SchoolSwitcher />

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        <span className="sr-only">Cambiar tema</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="relative size-8 rounded-full p-0" />
          }
        >
          <Avatar size="sm">
            <AvatarImage src={profile?.avatarUrl ?? undefined} />
            <AvatarFallback>
              {profile?.firstName?.charAt(0) ?? "U"}
              {profile?.lastName?.charAt(0) ?? ""}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="min-w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">
              {profile?.firstName} {profile?.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()}>
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
