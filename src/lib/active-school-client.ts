const STORAGE_KEY = "activeSchoolId"

export function getActiveSchoolId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setActiveSchoolId(id: string | null) {
  if (typeof window === "undefined") return
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Ignore storage errors
  }
}
