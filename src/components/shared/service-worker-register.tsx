"use client"

import { useEffect } from "react"
import "@/lib/pwa"

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
    }
  }, [])

  return null
}
