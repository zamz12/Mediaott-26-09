import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/providers";
import { ulid } from "ulid";

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
