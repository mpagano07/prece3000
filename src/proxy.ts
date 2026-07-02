import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Role } from "@/types/database"

const routePermissions: Record<string, Role[]> = {
  "/admin": ["super_admin"],
  "/admin/users": ["super_admin"],
  "/admin/schools": ["super_admin"],
  "/students": ["super_admin", "preceptor", "school_admin", "director", "secretary"],
  "/courses": ["super_admin", "school_admin", "director", "preceptor"],
  "/teachers": ["super_admin", "school_admin", "director"],
  "/reports": ["super_admin", "school_admin", "director", "preceptor"],
  "/settings": ["super_admin", "school_admin", "director", "preceptor"],
  "/book": ["super_admin", "preceptor"],
  "/communications": ["super_admin", "preceptor"],
}

const authenticatedRoutes = [
  "/dashboard",
  "/calendar",
  "/documents",
  "/agenda",
  "/search",
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next()
  }

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/auth"
    return NextResponse.redirect(loginUrl)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle()

  const role = profile?.role

  const matchedRoute = Object.keys(routePermissions).find((route) =>
    pathname.startsWith(route)
  )

  if (matchedRoute && role) {
    const allowedRoles = routePermissions[matchedRoute]
    if (!allowedRoles.includes(role)) {
      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = "/dashboard"
      return NextResponse.redirect(dashboardUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_next/|favicon.ico|sitemap.xml|robots.txt|.*\\.[a-z]+$).*)",
  ],
}
