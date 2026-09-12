import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/rbac";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  const u = session.user;
  return {
    id: u.id,
    email: u.email ?? "",
    displayName: u.name ?? "",
    roles: u.roles ?? [],
    adminSubRoles: u.adminSubRoles ?? [],
    subscriptionTier: u.subscriptionTier ?? "FREE",
  };
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
