import { Worker } from "bullmq";
import { prisma } from "@/lib/prisma";
import { getRedisConnection, type TranscodeJobData } from "@/lib/queue";
import { getTranscodeProviderAsync } from "@/lib/providers";
import { requestAutoSubtitle } from "@/modules/media/subtitles";

export function startTranscodeWorker() {
  return new Worker<TranscodeJobData>(
    "transcode",
    async (job) => {
      const { transcodeJobId, videoAssetId, masterBucket, masterKey } = job.data;

      await prisma.transcodeJob.update({ where: { id: transcodeJobId }, data: { status: "RUNNING", startedAt: new Date() } });

      try {
        const provider = await getTranscodeProviderAsync();
        const result = await provider.transcode({ videoAssetId, masterBucket, masterKey });

        await prisma.$transaction([
          prisma.videoAsset.update({
            where: { id: videoAssetId },
            data: {
              hlsManifestKey: result.hlsManifestKey,
              thumbnailStorageKey: result.thumbnailKey,
              previewStorageKey: result.previewKey,
              durationSeconds: result.durationSeconds || undefined,
            },
          }),
          ...result.renditions.map((r) =>
            prisma.videoRendition.upsert({
              where: { videoAssetId_resolution: { videoAssetId, resolution: r.resolution } },
              update: { bitrateKbps: r.bitrateKbps, storageKey: r.storageKey },
              create: { videoAssetId, resolution: r.resolution, bitrateKbps: r.bitrateKbps, storageKey: r.storageKey },
            }),
          ),
          prisma.transcodeJob.update({ where: { id: transcodeJobId }, data: { status: "SUCCEEDED", completedAt: new Date() } }),
        ]);

        const asset = await prisma.videoAsset.findUniqueOrThrow({ where: { id: videoAssetId } });
        await prisma.content.update({
          where: { id: asset.contentId },
          data: { status: "UNDER_REVIEW", durationSeconds: result.durationSeconds || undefined },
        });
        await prisma.moderationCase.create({ data: { contentId: asset.contentId, status: "PENDING" } });

        // Auto-request a draft transcript so subtitles are ready to review
        // as soon as the video is (Section 11) — a creator can also
        // trigger this again later from the content editor.
        await requestAutoSubtitle(videoAssetId);
      } catch (err) {
        await prisma.transcodeJob.update({
          where: { id: transcodeJobId },
          data: { status: "FAILED", errorMessage: err instanceof Error ? err.message : String(err), completedAt: new Date() },
        });

        // Without this, Content.status stays stuck at PROCESSING forever on
        // failure — nothing else ever moves it, so the creator sees an
        // indefinite spinner with no indication anything went wrong. Back to
        // DRAFT so they can see the failure (surfaced from TranscodeJob on
        // the content editor) and re-upload.
        const asset = await prisma.videoAsset.findUnique({ where: { id: videoAssetId } });
        if (asset) await prisma.content.update({ where: { id: asset.contentId }, data: { status: "DRAFT" } });

        throw err;
      }
    },
    { connection: getRedisConnection() },
  );
}
