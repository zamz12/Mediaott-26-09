import { Worker } from "bullmq";
import { prisma } from "@/lib/prisma";
import { getRedisConnection, getTranscriptQueue, type TranscodeJobData } from "@/lib/queue";
import { getTranscodeProviderAsync } from "@/lib/providers";

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
        await prisma.content.update({ where: { id: asset.contentId }, data: { status: "UNDER_REVIEW" } });
        await prisma.moderationCase.create({ data: { contentId: asset.contentId, status: "PENDING" } });

        const transcriptJob = await prisma.transcriptJob.create({
          data: { videoAssetId, status: "QUEUED", provider: process.env.TRANSCRIPTION_PROVIDER ?? "stub" },
        });
        await getTranscriptQueue().add("transcript", { transcriptJobId: transcriptJob.id, videoAssetId });
      } catch (err) {
        await prisma.transcodeJob.update({
          where: { id: transcodeJobId },
          data: { status: "FAILED", errorMessage: err instanceof Error ? err.message : String(err), completedAt: new Date() },
        });
        throw err;
      }
    },
    { connection: getRedisConnection() },
  );
}
