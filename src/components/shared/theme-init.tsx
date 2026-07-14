"use client"

import { useEffect } from "react"

export function ThemeInit() {
  useEffect(() => {
    try {
      const t = localStorage.getItem("theme")
      if (t === "dark") {
        document.documentElement.classList.add("dark")
      } else if (t !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark")
      }
    } catch (e) {}
    try {
      ;(window as any).__deferredInstallPrompt = null
      window.addEventListener("beforeinstallprompt", (e: Event) => {
        e.preventDefault()
        ;(window as any).__deferredInstallPrompt = e
      })
      window.addEventListener("appinstalled", () => {
        ;(window as any).__deferredInstallPrompt = null
      })
    } catch (e) {}
  }, [])

  return null
}
