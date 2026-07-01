"use client"

import { useEffect, useState } from "react"

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches)

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
    }

    const userAgent = window.navigator.userAgent
    const iOS = /iPad|iPhone|iPod/.test(userAgent)
    setIsIOS(iOS)

    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handler)

    if (iOS && !isStandalone) {
      setShowPrompt(true)
    }

    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    deferredPrompt.userChoice.then(() => {
      setDeferredPrompt(null)
      setShowPrompt(false)
    })
  }

  if (isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-lg border bg-card p-4 shadow-lg">
      {isIOS ? (
        <div className="text-sm">
          <p className="mb-2 font-semibold">Instalar Preceptor</p>
          <p className="text-muted-foreground">
            Presiona{" "}
            <span className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              Compartir
            </span>{" "}
            →{" "}
            <span className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              Agregar a pantalla de inicio
            </span>
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm">
            <p className="font-semibold">Instalar Preceptor</p>
            <p className="text-muted-foreground">
              Agrega la app a tu pantalla de inicio
            </p>
          </div>
          <button
            onClick={handleInstall}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Instalar
          </button>
        </div>
      )}
    </div>
  )
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}
