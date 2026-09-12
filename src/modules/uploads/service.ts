import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/providers";
import { getTranscodeQueue } from "@/lib/queue";
import { attachPlatformVideoAsset } from "@/modules/media/service";
import { ulid } from "ulid";

export async function requestPlatformUpload(userId: string, channelId: string, fileName: string, contentType: string, sizeBytes: number) {
  const key = `${channelId}/${ulid()}-${fileName}`;
  const session = await getStorageProvider().createUploadSession({ bucket: "masters", key, contentType });

  const uploadSession = await prisma.uploadSession.create({
    data: {
      userId,
      channelId,
      targetBucket: "masters",
      storageKey: key,
      fileName,
      declaredMimeType: contentType,
      fileSizeBytes: BigInt(sizeBytes),
      status: "INITIATED",
    },
  });

  return { uploadUrl: session.uploadUrl, uploadSessionId: uploadSession.id };
}

// Shared by both the direct-upload flow and the vault-publish flow: attaches
// a PLATFORM VideoAsset to a master already sitting in the `masters` bucket
// and enqueues transcoding (Section 13). Never transcodes inline in the
// request — that always happens in the worker process.
export async function enqueueTranscodeForNewMaster(contentId: string, masterKey: string, uploadSessionId?: string) {
  const asset = await attachPlatformVideoAsset(contentId, masterKey);
  await prisma.content.update({ where: { id: contentId }, data: { status: "PROCESSING" } });

  const transcodeJob = await prisma.transcodeJob.create({
    data: { uploadSessionId, videoAssetId: asset.id, status: "QUEUED", provider: process.env.TRANSCODE_PROVIDER ?? "local-ffmpeg" },
  });

  await getTranscodeQueue().add("transcode", {
    transcodeJobId: transcodeJob.id,
    videoAssetId: asset.id,
    masterBucket: "masters",
    masterKey,
  });

  return asset;
}

export async function confirmPlatformUpload(uploadSessionId: string, contentId: string) {
  const uploadSession = await prisma.uploadSession.findUniqueOrThrow({ where: { id: uploadSessionId } });
  await getStorageProvider().completeUpload("masters", uploadSession.storageKey);
  await prisma.uploadSession.update({ where: { id: uploadSession.id }, data: { status: "COMPLETED", completedAt: new Date() } });

  return enqueueTranscodeForNewMaster(contentId, uploadSession.storageKey, uploadSession.id);
}
