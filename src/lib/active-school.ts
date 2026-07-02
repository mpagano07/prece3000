let activeSchoolId: string | null = null

export function getActiveSchoolId(): string | null {
  return activeSchoolId
}

export function setActiveSchoolId(id: string | null) {
  activeSchoolId = id
}
