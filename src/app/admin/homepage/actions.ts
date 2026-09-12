"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { assert, canCurateHomepage } from "@/lib/rbac";
import { logAdminAction } from "@/modules/admin/audit";
import {
  addManualItem, createHomepageSection, deleteHomepageSection, moveSectionOrder, removeManualItem,
  toggleSectionVisibility, updateSectionFilter,
} from "@/modules/admin/homepage";
import { prisma } from "@/lib/prisma";
import type { HomepageAlgorithm } from "@prisma/client";

export async function createSectionAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin));
  const title = formData.get("title") as string;
  const key = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const algorithm = formData.get("algorithm") as HomepageAlgorithm;
  const section = await createHomepageSection(key, title, algorithm);
  await logAdminAction(admin.id, "homepage.section.create", "HomepageSection", section.id, { title, algorithm });
  revalidatePath("/admin/homepage");
}

export async function moveSectionAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin));
  const sectionId = formData.get("sectionId") as string;
  const direction = formData.get("direction") as "UP" | "DOWN";
  await moveSectionOrder(sectionId, direction);
  await logAdminAction(admin.id, "homepage.section.reorder", "HomepageSection", sectionId, { direction });
  revalidatePath("/admin/homepage");
}

export async function toggleSectionAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin));
  const sectionId = formData.get("sectionId") as string;
  await toggleSectionVisibility(sectionId);
  await logAdminAction(admin.id, "homepage.section.toggle", "HomepageSection", sectionId);
  revalidatePath("/admin/homepage");
}

export async function deleteSectionAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin));
  const sectionId = formData.get("sectionId") as string;
  await deleteHomepageSection(sectionId);
  await logAdminAction(admin.id, "homepage.section.delete", "HomepageSection", sectionId);
  revalidatePath("/admin/homepage");
}

export async function updateSectionFilterAction(sectionId: string, formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin));
  const algorithm = formData.get("algorithm") as HomepageAlgorithm;
  const categoryKey = formData.get("categoryKey") as string;
  const genreKey = formData.get("genreKey") as string;
  await updateSectionFilter(sectionId, algorithm, { categoryKey: categoryKey || undefined, genreKey: genreKey || undefined });
  await logAdminAction(admin.id, "homepage.section.update_filter", "HomepageSection", sectionId, { algorithm });
  revalidatePath(`/admin/homepage/${sectionId}`);
}

export async function addManualItemAction(sectionId: string, formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin));
  const slug = formData.get("slug") as string;
  const content = await prisma.content.findFirstOrThrow({ where: { slug } });
  await addManualItem(sectionId, content.id);
  await logAdminAction(admin.id, "homepage.item.add", "HomepageSection", sectionId, { slug });
  revalidatePath(`/admin/homepage/${sectionId}`);
}

export async function removeManualItemAction(sectionId: string, formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin));
  const itemId = formData.get("itemId") as string;
  await removeManualItem(itemId);
  await logAdminAction(admin.id, "homepage.item.remove", "HomepageSection", sectionId, { itemId });
  revalidatePath(`/admin/homepage/${sectionId}`);
}
