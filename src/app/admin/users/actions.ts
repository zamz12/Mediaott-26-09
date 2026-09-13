"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { assert, canModerate, isSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { logAdminAction } from "@/modules/admin/audit";
import type { AdminSubRole, PlatformRole } from "@prisma/client";

export async function suspendUserAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canModerate(admin), "You don't have permission to suspend accounts.");
  const userId = formData.get("userId") as string;
  const reason = (formData.get("reason") as string) || "Suspended by admin";

  await prisma.user.update({ where: { id: userId }, data: { isSuspended: true, suspendedReason: reason } });
  await logAdminAction(admin.id, "user.suspend", "User", userId, { reason });
  revalidatePath("/admin/users");
}

export async function unsuspendUserAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canModerate(admin), "You don't have permission to unsuspend accounts.");
  const userId = formData.get("userId") as string;

  await prisma.user.update({ where: { id: userId }, data: { isSuspended: false, suspendedReason: null } });
  await logAdminAction(admin.id, "user.unsuspend", "User", userId);
  revalidatePath("/admin/users");
}

export async function assignAdminSubRoleAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(isSuperAdmin(admin), "Only Super Admins can assign admin sub-roles.");

  const userId = formData.get("userId") as string;
  const subRole = formData.get("subRole") as AdminSubRole;

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId, roleId: adminRole.id } }, update: {}, create: { userId, roleId: adminRole.id } });
  await prisma.adminAssignment.upsert({
    where: { userId_subRole: { userId, subRole } },
    update: {},
    create: { userId, subRole, grantedBy: admin.id },
  });

  await logAdminAction(admin.id, "user.assign_admin_subrole", "User", userId, { subRole });
  revalidatePath("/admin/users");
}

export class UserCreationError extends Error {}

export async function createUserAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(isSuperAdmin(admin), "Only Super Admins can create platform accounts directly.");

  const email = (formData.get("email") as string).toLowerCase().trim();
  const handle = (formData.get("handle") as string).toLowerCase().trim();
  const displayName = formData.get("displayName") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as PlatformRole;
  const adminSubRole = (formData.get("adminSubRole") as AdminSubRole) || undefined;

  const [existingEmail, existingHandle] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { handle } }),
  ]);
  if (existingEmail) throw new UserCreationError("A user with this email already exists.");
  if (existingHandle) throw new UserCreationError("This handle is already taken.");

  const roleRow = await prisma.role.findUniqueOrThrow({ where: { name: role } });
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      handle,
      displayName,
      passwordHash,
      userRoles: { create: { roleId: roleRow.id } },
      profile: { create: {} },
      storageQuota: { create: {} },
      ...(role === "ADMIN" && adminSubRole ? { adminSubRoles: { create: { subRole: adminSubRole, grantedBy: admin.id } } } : {}),
    },
  });

  await logAdminAction(admin.id, "user.create", "User", user.id, { email, role, adminSubRole });
  revalidatePath("/admin/users");
}
