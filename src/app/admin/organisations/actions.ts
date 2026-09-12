"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { assert, canManageOrganisations } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { OrganisationRole } from "@prisma/client";
import { logAdminAction } from "@/modules/admin/audit";

export async function createOrganisationAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canManageOrganisations(admin));

  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const org = await prisma.organisation.create({ data: { name, type, slug } });
  await logAdminAction(admin.id, "organisation.create", "Organisation", org.id, { name, type });
  revalidatePath("/admin/organisations");
}

export async function addOrganisationMemberAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canManageOrganisations(admin));

  const organisationId = formData.get("organisationId") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as OrganisationRole;

  const user = await prisma.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
  await prisma.organisationMember.upsert({
    where: { organisationId_userId: { organisationId, userId: user.id } },
    update: { role },
    create: { organisationId, userId: user.id, role },
  });

  const orgMemberRole = await prisma.role.findUnique({ where: { name: "ORGANISATION_MEMBER" } });
  if (orgMemberRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: orgMemberRole.id } },
      update: {},
      create: { userId: user.id, roleId: orgMemberRole.id },
    });
  }

  await logAdminAction(admin.id, "organisation.add_member", "Organisation", organisationId, { email, role });
  revalidatePath("/admin/organisations");
}
