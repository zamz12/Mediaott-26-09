"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { assert, canCurateHomepage } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/modules/admin/audit";

export async function setFeaturedHeroAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin));
  const slug = formData.get("slug") as string;
  const content = await prisma.content.findFirstOrThrow({ where: { slug } });

  const hero = await prisma.homepageSection.upsert({
    where: { key: "hero" },
    update: {},
    create: { key: "hero", title: "Hero", algorithm: "MANUAL", sortOrder: -1, isVisible: false },
  });

  await prisma.homepageSectionItem.deleteMany({ where: { sectionId: hero.id } });
  await prisma.homepageSectionItem.create({ data: { sectionId: hero.id, contentId: content.id, position: 0 } });

  await logAdminAction(admin.id, "homepage.hero.set", "Content", content.id, { slug });
  revalidatePath("/admin/featured");
  revalidatePath("/");
}
