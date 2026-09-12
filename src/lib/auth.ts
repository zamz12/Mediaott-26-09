import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { verifyPassword } from "@/lib/password";
import type { PlatformRoleName } from "@/lib/rbac";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // OAuth providers (Google, Apple, government SSO) can be added here later
  // without changing anything downstream — session shape stays the same.
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { userRoles: { include: { role: true } }, adminSubRoles: true },
        });
        if (!user || !user.passwordHash || user.isSuspended || user.deletedAt) return null;

        const valid = await verifyPassword(user.passwordHash, password);
        if (!valid) return null;

        await prisma.loginHistory.create({
          data: { userId: user.id, success: true },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          roles: user.userRoles.map((ur) => ur.role.name as PlatformRoleName),
          adminSubRoles: user.adminSubRoles.map((a) => a.subRole),
          subscriptionTier: user.subscriptionTier,
        };
      },
    }),
  ],
});
