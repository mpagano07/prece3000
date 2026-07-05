"use client"

import { useEffect, useState, useRef } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getDeferredInstallPrompt, clearDeferredInstallPrompt } from "@/lib/pwa"

function isMobile(): boolean {
  if (typeof window === "undefined") return false
  return /Mobi|Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent)
}

function isiOS(): boolean {
  if (typeof window === "undefined") return false
  const ua = window.navigator.userAgent
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.maxTouchPoints > 2 && /Macintosh/.test(ua))
  )
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [installable, setInstallable] = useState(false)
  const dismissed = useRef(false)

  useEffect(() => {
    if (isStandalone()) return
    if (dismissed.current) return
    if (!isMobile()) return

    const prompt = getDeferredInstallPrompt()
    if (prompt) {
      setInstallable(true)
      setVisible(true)
      return
    }

    if (isiOS()) {
      setVisible(true)
      return
    }

    function onBeforeInstall(e: Event) {
      setInstallable(true)
      setVisible(true)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall)

    const timer = setTimeout(() => {
      setVisible(true)
    }, 4000)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      clearTimeout(timer)
    }
  }, [])

  function handleInstall() {
    const prompt = getDeferredInstallPrompt()
    if (!prompt) return
    prompt.prompt()
    prompt.userChoice.finally(() => {
      clearDeferredInstallPrompt()
      setInstallable(false)
      setVisible(false)
    })
  }

  function dismiss() {
    dismissed.current = true
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-4 pb-6 shadow-lg">
      <div className="mx-auto flex max-w-lg items-start justify-between gap-3">
        <div className="min-w-0 text-sm">
          <p className="font-semibold">Instalar ElPrece</p>
          {isiOS() ? (
            <p className="text-muted-foreground">
              Presioná Compartir{" "}
              <span className="inline-block rounded bg-muted px-1 font-mono text-xs">
                ⌘
              </span>{" "}
              →{" "}
              <span className="inline-block rounded bg-muted px-1 font-mono text-xs">
                Agregar a pantalla de inicio
              </span>
            </p>
          ) : installable ? (
            <p className="text-muted-foreground">
              Instalá la app para acceder más rápido
            </p>
          ) : (
            <p className="text-muted-foreground">
              Abrí el menú del navegador →{" "}
              <span className="font-medium">Agregar a pantalla de inicio</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {installable && (
            <Button size="sm" onClick={handleInstall}>
              Instalar
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={dismiss}>
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
