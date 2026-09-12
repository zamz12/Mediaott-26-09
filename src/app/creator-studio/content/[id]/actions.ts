"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { archiveContent, submitContentForReview, updateContentMetadata } from "@/modules/media/service";
import { contentMetadataSchema } from "@/modules/media/schema";
import { addManualSubtitle } from "@/modules/media/subtitles";
import { assert } from "@/lib/rbac";

async function assertOwnsContent(userId: string, contentId: string) {
  const content = await prisma.content.findFirstOrThrow({ where: { id: contentId }, include: { channel: true } });
  assert(content.channel.ownerUserId === userId, "You don't own this content.");
  return content;
}

export async function updateMetadataAction(contentId: string, formData: FormData) {
  const user = await requireSessionUser();
  await assertOwnsContent(user.id, contentId);

  const parsed = contentMetadataSchema.parse({
    title: formData.get("title"),
    synopsis: formData.get("synopsis") || undefined,
    contentType: formData.get("contentType"),
    categoryId: formData.get("categoryId") || undefined,
    genreIds: formData.getAll("genreIds"),
    originalLanguageId: formData.get("originalLanguageId") || undefined,
    rating: formData.get("rating"),
    releaseYear: formData.get("releaseYear") || undefined,
    visibility: formData.get("visibility"),
    scheduledAt: formData.get("scheduledAt") || undefined,
    ownsContent: formData.get("ownsContent") === "on",
    authorisedToPublish: formData.get("authorisedToPublish") === "on",
    isAiGenerated: formData.get("isAiGenerated") === "on",
    containsPaidPromotion: formData.get("containsPaidPromotion") === "on",
  });

  await updateContentMetadata(contentId, parsed);
  revalidatePath(`/creator-studio/content/${contentId}`);
}

export async function submitForReviewAction(contentId: string) {
  const user = await requireSessionUser();
  const content = await assertOwnsContent(user.id, contentId);
  assert(content.ownsContent && content.authorisedToPublish, "You must confirm ownership and authorisation before publishing.");
  await submitContentForReview(contentId);
  revalidatePath(`/creator-studio/content/${contentId}`);
}

export async function archiveContentAction(contentId: string) {
  const user = await requireSessionUser();
  await assertOwnsContent(user.id, contentId);
  await archiveContent(contentId);
  revalidatePath("/creator-studio/content");
}

export async function addSubtitleAction(contentId: string, videoAssetId: string, formData: FormData) {
  const user = await requireSessionUser();
  await assertOwnsContent(user.id, contentId);

  const languageId = formData.get("languageId") as string;
  const format = formData.get("format") as "SRT" | "VTT";
  const content = formData.get("content") as string;
  if (!languageId || !content?.trim()) return;

  await addManualSubtitle(videoAssetId, languageId, format, content);
  revalidatePath(`/creator-studio/content/${contentId}`);
}
