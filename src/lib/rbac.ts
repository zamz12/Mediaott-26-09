import type { AdminSubRole } from "@prisma/client";

// RBAC policy layer (Section 2/24/35). Every server action / route handler
// must call one of these — authorization is NEVER enforced by hiding a
// button in the UI (Section 45).

export type PlatformRoleName = "VIEWER" | "CREATOR" | "ORGANISATION_MEMBER" | "ADMIN";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  roles: PlatformRoleName[];
  adminSubRoles: AdminSubRole[];
  subscriptionTier: string;
}

export function hasRole(user: SessionUser | null | undefined, role: PlatformRoleName): boolean {
  return !!user?.roles.includes(role);
}

export function isAdmin(user: SessionUser | null | undefined): boolean {
  return hasRole(user, "ADMIN");
}

export function hasAdminSubRole(user: SessionUser | null | undefined, subRole: AdminSubRole): boolean {
  return isAdmin(user) && !!user?.adminSubRoles.includes(subRole);
}

export function isSuperAdmin(user: SessionUser | null | undefined): boolean {
  return hasAdminSubRole(user, "SUPER_ADMIN");
}

export function canModerate(user: SessionUser | null | undefined): boolean {
  return isSuperAdmin(user) || hasAdminSubRole(user, "MODERATOR") || hasAdminSubRole(user, "CONTENT_ADMIN");
}

export function canCurateHomepage(user: SessionUser | null | undefined): boolean {
  return isSuperAdmin(user) || hasAdminSubRole(user, "CONTENT_ADMIN");
}

export function canManageFinance(user: SessionUser | null | undefined): boolean {
  return isSuperAdmin(user) || hasAdminSubRole(user, "FINANCE_ADMIN");
}

export function canManageOrganisations(user: SessionUser | null | undefined): boolean {
  return isSuperAdmin(user) || hasAdminSubRole(user, "ORGANISATION_ADMIN");
}

export function isCreator(user: SessionUser | null | undefined): boolean {
  return hasRole(user, "CREATOR");
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) throw new ForbiddenError(message);
}
