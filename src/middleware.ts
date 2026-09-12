import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Edge-level gate for admin/creator-studio route groups. This is a UX
// convenience (fast redirect) — the real enforcement lives server-side in
// each route handler/server action via src/lib/rbac.ts, since middleware
// alone must never be the only authorization check (Section 45).
// Uses the edge-safe authConfig (no Credentials/argon2) so the Edge runtime
// bundle never pulls in Node-only native bindings.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  if (pathname.startsWith("/admin")) {
    const roles: string[] = user?.roles ?? [];
    if (!roles.includes("ADMIN")) {
      return NextResponse.redirect(new URL("/login?callbackUrl=" + pathname, req.url));
    }
  }

  if (pathname.startsWith("/creator-studio")) {
    const roles: string[] = user?.roles ?? [];
    if (!roles.includes("CREATOR") && !roles.includes("ADMIN")) {
      return NextResponse.redirect(new URL("/login?callbackUrl=" + pathname, req.url));
    }
  }

  if (pathname.startsWith("/account") && !user) {
    return NextResponse.redirect(new URL("/login?callbackUrl=" + pathname, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/creator-studio/:path*", "/account/:path*"],
};
