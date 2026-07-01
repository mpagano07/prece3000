import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { SupabaseClient } from "@supabase/supabase-js"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function isImageFile(filename: string): boolean {
  return /\.(jpg|jpeg|png|webp)$/i.test(filename)
}

export function isPdfFile(filename: string): boolean {
  return /\.pdf$/i.test(filename)
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export async function createAuditLog(
  supabase: SupabaseClient,
  schoolId: string,
  userId: string,
  action: string,
  tableName: string,
  recordId: string | null,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null
) {
  const { error } = await supabase.from("audit_log").insert({
    school_id: schoolId,
    user_id: userId,
    action,
    table_name: tableName,
    record_id: recordId,
    old_values: oldValues,
    new_values: newValues,
  })

  if (error) {
    console.error("Failed to create audit log:", error)
  }
}
