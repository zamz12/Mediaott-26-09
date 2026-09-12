import { describe, expect, it } from "vitest";
import { assert, canModerate, hasRole, isAdmin, isSuperAdmin, ForbiddenError } from "@/lib/rbac";
import type { SessionUser } from "@/lib/rbac";

function user(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "u1",
    email: "a@b.com",
    displayName: "Test",
    roles: [],
    adminSubRoles: [],
    subscriptionTier: "FREE",
    ...overrides,
  };
}

describe("rbac", () => {
  it("hasRole checks the roles array", () => {
    expect(hasRole(user({ roles: ["CREATOR"] }), "CREATOR")).toBe(true);
    expect(hasRole(user({ roles: ["VIEWER"] }), "CREATOR")).toBe(false);
    expect(hasRole(null, "VIEWER")).toBe(false);
  });

  it("isAdmin requires the ADMIN role", () => {
    expect(isAdmin(user({ roles: ["ADMIN"] }))).toBe(true);
    expect(isAdmin(user({ roles: ["CREATOR"] }))).toBe(false);
  });

  it("isSuperAdmin requires ADMIN role AND the SUPER_ADMIN sub-role", () => {
    expect(isSuperAdmin(user({ roles: ["ADMIN"], adminSubRoles: ["SUPER_ADMIN"] }))).toBe(true);
    // Sub-role alone without the coarse ADMIN role must not count.
    expect(isSuperAdmin(user({ roles: [], adminSubRoles: ["SUPER_ADMIN"] }))).toBe(false);
  });

  it("canModerate accepts SUPER_ADMIN, MODERATOR or CONTENT_ADMIN", () => {
    expect(canModerate(user({ roles: ["ADMIN"], adminSubRoles: ["MODERATOR"] }))).toBe(true);
    expect(canModerate(user({ roles: ["ADMIN"], adminSubRoles: ["FINANCE_ADMIN"] }))).toBe(false);
  });

  it("assert throws ForbiddenError when the condition is false", () => {
    expect(() => assert(false, "nope")).toThrow(ForbiddenError);
    expect(() => assert(true)).not.toThrow();
  });
});
