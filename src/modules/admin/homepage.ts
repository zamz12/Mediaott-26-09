import { prisma } from "@/lib/prisma";
import type { HomepageAlgorithm, Prisma } from "@prisma/client";

export interface HomepageSectionFilter {
  categoryKey?: string;
  genreKey?: string;
}

export async function listHomepageSections() {
  return prisma.homepageSection.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { items: true } } } });
}

export async function createHomepageSection(key: string, title: string, algorithm: HomepageAlgorithm) {
  const max = await prisma.homepageSection.aggregate({ _max: { sortOrder: true } });
  return prisma.homepageSection.create({
    data: { key, title, algorithm, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });
}

export async function moveSectionOrder(sectionId: string, direction: "UP" | "DOWN") {
  const sections = await prisma.homepageSection.findMany({ orderBy: { sortOrder: "asc" } });
  const idx = sections.findIndex((s) => s.id === sectionId);
  const swapIdx = direction === "UP" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= sections.length) return;

  const a = sections[idx];
  const b = sections[swapIdx];
  await prisma.$transaction([
    prisma.homepageSection.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    prisma.homepageSection.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ]);
}

export async function toggleSectionVisibility(sectionId: string) {
  const section = await prisma.homepageSection.findUniqueOrThrow({ where: { id: sectionId } });
  return prisma.homepageSection.update({ where: { id: sectionId }, data: { isVisible: !section.isVisible } });
}

export async function deleteHomepageSection(sectionId: string) {
  await prisma.homepageSection.delete({ where: { id: sectionId } });
}

export async function getSectionWithItems(sectionId: string) {
  return prisma.homepageSection.findUniqueOrThrow({
    where: { id: sectionId },
    include: { items: { orderBy: { position: "asc" }, include: { content: { select: { title: true, slug: true } } } } },
  });
}

export async function addManualItem(sectionId: string, contentId: string) {
  const max = await prisma.homepageSectionItem.aggregate({ where: { sectionId }, _max: { position: true } });
  return prisma.homepageSectionItem.create({ data: { sectionId, contentId, position: (max._max.position ?? 0) + 1 } });
}

export async function removeManualItem(itemId: string) {
  await prisma.homepageSectionItem.delete({ where: { id: itemId } });
}

export async function updateSectionFilter(sectionId: string, algorithm: HomepageAlgorithm, filterJson: HomepageSectionFilter) {
  return prisma.homepageSection.update({ where: { id: sectionId }, data: { algorithm, filterJson: filterJson as Prisma.InputJsonValue } });
}
