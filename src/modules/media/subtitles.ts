import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/providers";
import { getTranscriptQueue } from "@/lib/queue";
import { ulid } from "ulid";
import type { TranscriptSegment } from "@/lib/providers/transcription.provider";

export async function addManualSubtitle(videoAssetId: string, languageId: string, format: "SRT" | "VTT", content: string) {
  const key = `${videoAssetId}/${ulid()}.${format.toLowerCase()}`;
  await getStorageProvider().putObject("subtitles", key, content, format === "VTT" ? "text/vtt" : "application/x-subrip");

  // Manual upload is reviewed by definition — the creator supplied it directly.
  return prisma.subtitle.upsert({
    where: { videoAssetId_languageId: { videoAssetId, languageId } },
    update: { format, storageKey: key, source: "UPLOADED", isReviewed: true },
    create: { videoAssetId, languageId, format, storageKey: key, source: "UPLOADED", isReviewed: true },
  });
}

export async function listSubtitles(videoAssetId: string) {
  return prisma.subtitle.findMany({ where: { videoAssetId }, include: { language: true } });
}

// Creator/editor approval gate for AI-generated transcripts (Section 11) —
// never flips to true automatically.
export async function reviewSubtitle(subtitleId: string) {
  return prisma.subtitle.update({ where: { id: subtitleId }, data: { isReviewed: true } });
}

function formatVttTimestamp(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const msRemainder = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(msRemainder).padStart(3, "0")}`;
}

export function segmentsToVtt(segments: TranscriptSegment[]): string {
  const cues = segments
    .map((seg) => `${formatVttTimestamp(seg.startMs)} --> ${formatVttTimestamp(seg.endMs)}\n${seg.text}`)
    .join("\n\n");
  return `WEBVTT\n\n${cues}\n`;
}

// Kicks off the "video -> extract audio -> speech-to-text -> creator review"
// workflow (Section 11) on demand, rather than only right after a fresh
// upload — e.g. a creator who skipped subtitles initially can request them
// later from the content editor.
export async function requestAutoSubtitle(videoAssetId: string) {
  const job = await prisma.transcriptJob.create({
    data: { videoAssetId, status: "QUEUED", provider: process.env.TRANSCRIPTION_PROVIDER ?? "stub" },
  });
  await getTranscriptQueue().add("transcript", { transcriptJobId: job.id, videoAssetId });
  return job;
}
