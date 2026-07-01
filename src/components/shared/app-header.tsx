"use client"

import { useTheme } from "@/contexts/theme-context"
import { Bell, Moon, Search, Sun, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

      <div className="hidden sm:block text-sm font-medium text-muted-foreground">
        {school?.name ?? "Preceptor"}
      </div>

      <div className="flex-1" />

      <Button variant="ghost" size="icon-sm">
        <Search className="size-4" />
        <span className="sr-only">Buscar</span>
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        <span className="sr-only">Cambiar tema</span>
      </Button>

      <Button variant="ghost" size="icon-sm" className="relative">
        <Bell className="size-4" />
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full p-0 text-[10px]"
        >
          3
        </Badge>
        <span className="sr-only">Notificaciones</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="relative size-8 rounded-full p-0" />
          }
        >
          <Avatar size="sm">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback>
              {profile?.first_name?.charAt(0) ?? "U"}
              {profile?.last_name?.charAt(0) ?? ""}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8}>
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
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
