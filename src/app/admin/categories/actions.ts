"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { assert, canCurateHomepage } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/modules/admin/audit";

export async function createCategoryAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin));
  const label = formData.get("label") as string;
  const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  await prisma.category.create({ data: { key, label } });
  await logAdminAction(admin.id, "taxonomy.category.create", "Category", key, { label });
  revalidatePath("/admin/categories");
}

export async function toggleCategoryActiveAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin));
  const id = formData.get("id") as string;
  const category = await prisma.category.findUniqueOrThrow({ where: { id } });
  await prisma.category.update({ where: { id }, data: { isActive: !category.isActive } });
  await logAdminAction(admin.id, "taxonomy.category.toggle", "Category", id, { isActive: !category.isActive });
  revalidatePath("/admin/categories");
}
