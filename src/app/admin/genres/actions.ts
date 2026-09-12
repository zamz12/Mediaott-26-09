"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { assert, canCurateHomepage } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/modules/admin/audit";

export async function createGenreAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin));
  const label = formData.get("label") as string;
  const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  await prisma.genre.create({ data: { key, label } });
  await logAdminAction(admin.id, "taxonomy.genre.create", "Genre", key, { label });
  revalidatePath("/admin/genres");
}

export async function toggleGenreActiveAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin));
  const id = formData.get("id") as string;
  const genre = await prisma.genre.findUniqueOrThrow({ where: { id } });
  await prisma.genre.update({ where: { id }, data: { isActive: !genre.isActive } });
  await logAdminAction(admin.id, "taxonomy.genre.toggle", "Genre", id, { isActive: !genre.isActive });
  revalidatePath("/admin/genres");
}
