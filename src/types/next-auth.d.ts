import type { DefaultSession } from "next-auth";
import type { AdminSubRole } from "@prisma/client";
import type { PlatformRoleName } from "@/lib/rbac";

declare module "next-auth" {
  interface User {
    roles?: PlatformRoleName[];
    adminSubRoles?: AdminSubRole[];
    subscriptionTier?: string;
  }

  interface Session {
    user: {
      id: string;
      roles: PlatformRoleName[];
      adminSubRoles: AdminSubRole[];
      subscriptionTier: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    roles?: PlatformRoleName[];
    adminSubRoles?: AdminSubRole[];
    subscriptionTier?: string;
  }
}
