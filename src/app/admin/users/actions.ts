"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { assert, isSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/modules/admin/audit";
import type { AdminSubRole } from "@prisma/client";

export async function suspendUserAction(formData: FormData) {
  const admin = await requireSessionUser();
  const userId = formData.get("userId") as string;
  const reason = (formData.get("reason") as string) || "Suspended by admin";

  await prisma.user.update({ where: { id: userId }, data: { isSuspended: true, suspendedReason: reason } });
  await logAdminAction(admin.id, "user.suspend", "User", userId, { reason });
  revalidatePath("/admin/users");
}

export async function unsuspendUserAction(formData: FormData) {
  const admin = await requireSessionUser();
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
