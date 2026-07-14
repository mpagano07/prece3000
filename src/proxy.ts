import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Role } from "@/types/database"

const routePermissions: Record<string, Role[]> = {
  "/admin": ["super_admin"],
  "/admin/users": ["super_admin"],
  "/admin/schools": ["super_admin"],
  "/students": ["super_admin", "preceptor", "school_admin", "director", "secretary", "teacher"],
  "/attendance": ["super_admin", "school_admin", "director", "secretary"],
  "/courses": ["super_admin", "school_admin", "director", "preceptor", "teacher"],
  "/teachers": ["super_admin", "school_admin", "director"],
  "/reports": ["super_admin", "school_admin", "director", "preceptor"],
  "/settings": ["super_admin", "school_admin", "director", "preceptor"],
  "/book": ["super_admin", "preceptor"],
  "/communications": ["super_admin", "preceptor", "teacher"],
  "/documents": ["super_admin", "school_admin", "director", "preceptor", "secretary"],
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next()
  }

  // Check for Better Auth session cookie
  const sessionCookie = request.cookies.get("better-auth.session_token")
    ?? request.cookies.get("__Secure-better-auth.session_token")

  if (!sessionCookie) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/auth"
    return NextResponse.redirect(loginUrl)
  }

  // For role-based access, we check via API call
  // The session cookie is validated server-side in each API route
  // For now, allow authenticated users through and check roles in the profile fetch
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_next/|favicon.ico|sitemap.xml|robots.txt|.*\\.[a-z]+$).*)",
  ],
}
