import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/providers";
import { ulid } from "ulid";
import { createDraftContent } from "@/modules/media/service";
import { enqueueTranscodeForNewMaster } from "@/modules/uploads/service";

export class QuotaExceededError extends Error {
  constructor() {
    super("This upload would exceed your storage quota.");
  }
}

export async function requestVaultUpload(userId: string, fileName: string, contentType: string, sizeBytes: number) {
  const quota = await prisma.storageQuota.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  if (quota.usedBytes + BigInt(sizeBytes) > quota.allocatedBytes) {
    throw new QuotaExceededError();
  }

  const key = `${userId}/${ulid()}-${fileName}`;
  const session = await getStorageProvider().createUploadSession({ bucket: "vault", key, contentType });

  const uploadSession = await prisma.uploadSession.create({
    data: {
      userId,
      targetBucket: "vault",
      storageKey: key,
      fileName,
      declaredMimeType: contentType,
      fileSizeBytes: BigInt(sizeBytes),
      status: "INITIATED",
    },
  });

  return { uploadUrl: session.uploadUrl, uploadSessionId: uploadSession.id, storageKey: key };
}

export async function confirmVaultUpload(userId: string, uploadSessionId: string) {
  const uploadSession = await prisma.uploadSession.findFirstOrThrow({
    where: { id: uploadSessionId, userId },
  });

  const { sizeBytes } = await getStorageProvider().completeUpload("vault", uploadSession.storageKey);

  await prisma.$transaction([
    prisma.uploadSession.update({ where: { id: uploadSession.id }, data: { status: "COMPLETED", completedAt: new Date() } }),
    prisma.vaultItem.create({
      data: {
        userId,
        fileName: uploadSession.fileName,
        storageKey: uploadSession.storageKey,
        sizeBytes: BigInt(sizeBytes || Number(uploadSession.fileSizeBytes)),
      },
    }),
    prisma.storageQuota.update({
      where: { userId },
      data: { usedBytes: { increment: sizeBytes || Number(uploadSession.fileSizeBytes) } },
    }),
  ]);
}

export async function listVaultItems(userId: string) {
  return prisma.vaultItem.findMany({ where: { userId, deletedAt: null }, orderBy: { createdAt: "desc" } });
}

// "Convert private item to publishable content" (Section 16) — requires an
// explicit creator action, never automatic. Copies the private-vault object
// into the masters bucket so the standard transcode pipeline can pick it up.
export async function publishVaultItem(userId: string, itemId: string, channelId: string, title: string) {
  const item = await prisma.vaultItem.findFirstOrThrow({ where: { id: itemId, userId } });
  if (item.publishedContentId) throw new Error("This vault item has already been published.");

  const storage = getStorageProvider();
  const bytes = await storage.getObject("vault", item.storageKey);
  const masterKey = `${channelId}/${ulid()}-${item.fileName}`;
  await storage.putObject("masters", masterKey, bytes, "video/mp4");

  const content = await createDraftContent(userId, channelId, title);
  await enqueueTranscodeForNewMaster(content.id, masterKey);
  await prisma.vaultItem.update({ where: { id: item.id }, data: { publishedContentId: content.id } });

  return content;
}

export async function deleteVaultItem(userId: string, itemId: string) {
  const item = await prisma.vaultItem.findFirstOrThrow({ where: { id: itemId, userId } });
  await getStorageProvider().deleteAsset("vault", item.storageKey);
  await prisma.$transaction([
    prisma.vaultItem.update({ where: { id: item.id }, data: { deletedAt: new Date() } }),
    prisma.storageQuota.update({ where: { userId }, data: { usedBytes: { decrement: item.sizeBytes } } }),
  ]);
}
