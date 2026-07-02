interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    deferredInstallPrompt = e as BeforeInstallPromptEvent
  })
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null
  })
}

export function getDeferredInstallPrompt() {
  return deferredInstallPrompt
}

export function clearDeferredInstallPrompt() {
  deferredInstallPrompt = null
}
