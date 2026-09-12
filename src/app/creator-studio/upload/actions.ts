"use server";

import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { createDraftContent, getMyChannels, attachExternalVideoAsset, submitContentForReview } from "@/modules/media/service";
import { confirmPlatformUpload, requestPlatformUpload } from "@/modules/uploads/service";
import { publishVaultItem } from "@/modules/vault/service";
import { prisma } from "@/lib/prisma";

async function requireChannel(userId: string) {
  const [channel] = await getMyChannels(userId);
  if (!channel) throw new Error("Create a channel before uploading.");
  return channel;
}

export async function createDraftForUploadAction(title: string): Promise<string> {
  const user = await requireSessionUser();
  const channel = await requireChannel(user.id);
  const content = await createDraftContent(user.id, channel.id, title);
  return content.id;
}

export async function requestPlatformUploadAction(contentId: string, fileName: string, contentType: string, sizeBytes: number) {
  const user = await requireSessionUser();
  const content = await prisma.content.findFirstOrThrow({ where: { id: contentId, createdByUserId: user.id } });
  return requestPlatformUpload(user.id, content.channelId, fileName, contentType, sizeBytes);
}

export async function confirmPlatformUploadAction(contentId: string, uploadSessionId: string) {
  await confirmPlatformUpload(uploadSessionId, contentId);
}

export async function createExternalContentAction(formData: FormData) {
  const user = await requireSessionUser();
  const channel = await requireChannel(user.id);
  const title = formData.get("title") as string;
  const provider = formData.get("provider") as "YOUTUBE" | "VIMEO" | "OTHER";
  const externalVideoId = formData.get("externalVideoId") as string;

  const content = await createDraftContent(user.id, channel.id, title);
  await attachExternalVideoAsset(content.id, provider, externalVideoId);
  await prisma.content.update({ where: { id: content.id }, data: { status: "READY" } });

  redirect(`/creator-studio/content/${content.id}`);
}

export async function publishVaultItemAction(formData: FormData) {
  const user = await requireSessionUser();
  const channel = await requireChannel(user.id);
  const vaultItemId = formData.get("vaultItemId") as string;
  const title = formData.get("title") as string;

  const content = await publishVaultItem(user.id, vaultItemId, channel.id, title);
  redirect(`/creator-studio/content/${content.id}`);
}

export async function submitForReviewFromUploadAction(contentId: string) {
  await submitContentForReview(contentId);
}
