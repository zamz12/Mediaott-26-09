import { Worker } from "bullmq";
import type { Prisma } from "@prisma/client";
import { ulid } from "ulid";
import { prisma } from "@/lib/prisma";
import { getRedisConnection, type TranscriptJobData } from "@/lib/queue";
import { getStorageProvider, getTranscriptionProvider } from "@/lib/providers";
import { segmentsToVtt } from "@/modules/media/subtitles";

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

        // Only materialize a Subtitle row when the provider actually
        // returned segments and we can identify the detected language —
        // the stub provider (no AI_TRANSCRIPTION feature flag) returns an
        // empty draft, so no unreviewable empty subtitle gets created.
        if (result.segments.length > 0) {
          const language = await prisma.language.findUnique({ where: { code: result.detectedLanguageCode } });
          if (language) {
            const key = `${videoAssetId}/${ulid()}.vtt`;
            await getStorageProvider().putObject("subtitles", key, segmentsToVtt(result.segments), "text/vtt");
            await prisma.subtitle.upsert({
              where: { videoAssetId_languageId: { videoAssetId, languageId: language.id } },
              update: { format: "VTT", storageKey: key, source: "AI_GENERATED", isReviewed: false },
              create: { videoAssetId, languageId: language.id, format: "VTT", storageKey: key, source: "AI_GENERATED", isReviewed: false },
            });
          }
        }

        await prisma.transcriptJob.update({
          where: { id: transcriptJobId },
          data: {
            status: "SUCCEEDED",
            completedAt: new Date(),
            rawTranscript: result as unknown as Prisma.InputJsonValue,
          },
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
