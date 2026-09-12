"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { assert, isSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/modules/admin/audit";

export async function updateBrandingAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(isSuperAdmin(admin), "Only Super Admins can change platform branding.");

  const name = formData.get("name") as string;
  const tagline = formData.get("tagline") as string;

  await prisma.$transaction([
    prisma.systemConfig.upsert({ where: { key: "brand.name" }, update: { value: name }, create: { key: "brand.name", value: name } }),
    prisma.systemConfig.upsert({ where: { key: "brand.tagline" }, update: { value: tagline }, create: { key: "brand.tagline", value: tagline } }),
  ]);

  await logAdminAction(admin.id, "settings.branding.update", "SystemConfig", "brand", { name, tagline });
  revalidatePath("/admin/settings");
  revalidatePath("/");
}
