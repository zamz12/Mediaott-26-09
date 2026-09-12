import { Worker } from "bullmq";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRedisConnection, type TranscriptJobData } from "@/lib/queue";
import { getTranscriptionProvider } from "@/lib/providers";

// Produces a DRAFT transcript only. Per Section 11, AI-generated subtitles
// are never auto-published — a creator/editor must review and approve
// (Subtitle.isReviewed) before they reach viewers.
export function startTranscriptWorker() {
  return new Worker<TranscriptJobData>(
    "transcript",
    async (job) => {
      const { transcriptJobId, videoAssetId } = job.data;
      await prisma.transcriptJob.update({ where: { id: transcriptJobId }, data: { status: "RUNNING" } });

      try {
        const asset = await prisma.videoAsset.findUniqueOrThrow({ where: { id: videoAssetId } });
        const result = await getTranscriptionProvider().transcribe("masters", asset.masterStorageKey ?? "");

        await prisma.transcriptJob.update({
          where: { id: transcriptJobId },
          data: { status: "SUCCEEDED", completedAt: new Date(), rawTranscript: result as unknown as Prisma.InputJsonValue },
        });
      } catch (err) {
        await prisma.transcriptJob.update({
          where: { id: transcriptJobId },
          data: { status: "FAILED", errorMessage: err instanceof Error ? err.message : String(err), completedAt: new Date() },
        });
        throw err;
      }
    },
    { connection: getRedisConnection() },
  );
}
