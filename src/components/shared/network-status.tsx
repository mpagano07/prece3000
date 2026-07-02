"use client"

import { useSyncExternalStore } from "react"
import { WifiOff, RefreshCw } from "lucide-react"
import { useIsRestoring } from "@tanstack/react-query"

function subscribe(callback: () => void) {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

function getSnapshot() {
  return navigator.onLine
}

function getServerSnapshot() {
  return true
}

export function NetworkStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const isRestoring = useIsRestoring()

  if (isOnline && !isRestoring) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-2 pointer-events-none">
      <div className="bg-background/95 backdrop-blur shadow-md border rounded-full px-4 py-1.5 flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-4">
        {!isOnline ? (
          <>
            <WifiOff className="size-4 text-destructive" />
            <span className="text-destructive">Sin conexión (Modo Offline)</span>
          </>
        ) : (
          <>
            <RefreshCw className="size-4 text-muted-foreground animate-spin" />
            <span className="text-muted-foreground">Sincronizando datos...</span>
          </>
        )}
      </div>
    </div>
  )
}
