import type { NextAuthConfig } from "next-auth";
import type { AdminSubRole } from "@prisma/client";
import type { PlatformRoleName } from "@/lib/rbac";

interface AppTokenClaims {
  id?: string;
  roles?: PlatformRoleName[];
  adminSubRoles?: AdminSubRole[];
  subscriptionTier?: string;
}

// Edge-safe subset of the Auth.js config (Section 44/31): no Credentials
// provider here, since it pulls in argon2's Node-only bindings, which the
// Edge middleware runtime cannot bundle. Middleware imports only this file;
// src/lib/auth.ts adds the Node-only provider for route handlers/actions.
//
// next-auth v5's callback generics don't merge cleanly with declaration
// merging across its "update"/database-session overloads, so the JWT/session
// shapes here are asserted through AppTokenClaims at this one interop
// boundary rather than fought with `any` scattered through the app.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      const claims = token as typeof token & AppTokenClaims;
      if (user) {
        const appUser = user as typeof user & AppTokenClaims;
        claims.id = appUser.id;
        claims.roles = appUser.roles ?? [];
        claims.adminSubRoles = appUser.adminSubRoles ?? [];
        claims.subscriptionTier = appUser.subscriptionTier ?? "FREE";
      }
      return claims;
    },
    async session({ session, token }) {
      const claims = token as typeof token & AppTokenClaims;
      const appSessionUser = session.user as typeof session.user & AppTokenClaims;
      appSessionUser.id = claims.id ?? appSessionUser.id;
      appSessionUser.roles = claims.roles ?? [];
      appSessionUser.adminSubRoles = claims.adminSubRoles ?? [];
      appSessionUser.subscriptionTier = claims.subscriptionTier ?? "FREE";
      return session;
    },
  },
};
