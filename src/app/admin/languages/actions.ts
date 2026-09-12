"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { assert, canCurateHomepage } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/modules/admin/audit";

export async function createLanguageAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin));
  const code = formData.get("code") as string;
  const label = formData.get("label") as string;
  const isUiLanguage = formData.get("isUiLanguage") === "on";
  await prisma.language.create({ data: { code, label, isUiLanguage } });
  await logAdminAction(admin.id, "taxonomy.language.create", "Language", code, { label });
  revalidatePath("/admin/languages");
}

export async function toggleUiLanguageAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin));
  const id = formData.get("id") as string;
  const language = await prisma.language.findUniqueOrThrow({ where: { id } });
  await prisma.language.update({ where: { id }, data: { isUiLanguage: !language.isUiLanguage } });
  await logAdminAction(admin.id, "taxonomy.language.toggle_ui", "Language", id);
  revalidatePath("/admin/languages");
}
