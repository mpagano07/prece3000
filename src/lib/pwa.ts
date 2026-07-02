interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

declare global {
  interface Window {
    __deferredInstallPrompt?: BeforeInstallPromptEvent | null
  }
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null

if (typeof window !== "undefined") {
  if (window.__deferredInstallPrompt) {
    deferredInstallPrompt = window.__deferredInstallPrompt
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    deferredInstallPrompt = e as BeforeInstallPromptEvent
    window.__deferredInstallPrompt = deferredInstallPrompt
  })
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null
    window.__deferredInstallPrompt = null
  })
}

export function getDeferredInstallPrompt() {
  return deferredInstallPrompt
}

export function clearDeferredInstallPrompt() {
  deferredInstallPrompt = null
  window.__deferredInstallPrompt = null
}
