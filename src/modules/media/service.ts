import { prisma } from "@/lib/prisma";
import { ulid } from "ulid";
import { getStorageProvider } from "@/lib/providers";
import { notifyModerators } from "@/modules/notifications/service";
import type { ContentMetadataInput } from "./schema";

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "channel"
  );
}

async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  let slug = slugify(base);
  let suffix = 0;
  while (await exists(slug)) {
    suffix += 1;
    slug = `${slugify(base)}-${suffix}`;
  }
  return slug;
}

export async function createChannel(userId: string, name: string, description?: string) {
  const slug = await uniqueSlug(name, async (s) => !!(await prisma.channel.findUnique({ where: { slug: s } })));
  return prisma.channel.create({ data: { name, slug, description, ownerUserId: userId } });
}

export async function getMyChannels(userId: string) {
  return prisma.channel.findMany({ where: { ownerUserId: userId, deletedAt: null } });
}

export async function updateChannel(channelId: string, data: { name?: string; description?: string; bannerUrl?: string; avatarUrl?: string; socialLinks?: Record<string, string> }) {
  return prisma.channel.update({ where: { id: channelId }, data });
}

export async function createDraftContent(userId: string, channelId: string, title: string) {
  const slug = await uniqueSlug(`${title}-${ulid().slice(-6)}`, async (s) => !!(await prisma.content.findUnique({ where: { slug: s } })));
  return prisma.content.create({
    data: { channelId, createdByUserId: userId, title, slug, status: "DRAFT", visibility: "PRIVATE", contentType: "SHORT_FILM" },
  });
}

export async function updateContentMetadata(contentId: string, input: ContentMetadataInput) {
  return prisma.$transaction(async (tx) => {
    await tx.contentGenre.deleteMany({ where: { contentId } });
    return tx.content.update({
      where: { id: contentId },
      data: {
        title: input.title,
        synopsis: input.synopsis,
        contentType: input.contentType,
        categoryId: input.categoryId || null,
        originalLanguageId: input.originalLanguageId || null,
        rating: input.rating,
        releaseYear: input.releaseYear,
        countryCode: input.countryCode || null,
        visibility: input.visibility,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        ownsContent: input.ownsContent,
        authorisedToPublish: input.authorisedToPublish,
        isAiGenerated: input.isAiGenerated,
        containsPaidPromotion: input.containsPaidPromotion,
        genres: { create: input.genreIds.map((genreId) => ({ genreId })) },
      },
    });
  });
}

export async function attachExternalVideoAsset(contentId: string, provider: "YOUTUBE" | "VIMEO" | "OTHER", externalVideoId: string) {
  return prisma.videoAsset.create({
    data: { contentId, sourceType: "EXTERNAL", externalProvider: provider, externalVideoId },
  });
}

export async function attachPlatformVideoAsset(contentId: string, masterStorageKey: string, orientation?: "LANDSCAPE" | "PORTRAIT") {
  return prisma.videoAsset.create({ data: { contentId, sourceType: "PLATFORM", masterStorageKey, orientation } });
}

// Shared by both submission paths (a straight-to-review submit here, and
// the transcode worker once processing finishes) so the moderator ping and
// its 18+/P13 flagging logic live in exactly one place.
export async function notifyContentSubmitted(content: { id: string; title: string; rating: string }) {
  const isSensitiveRating = content.rating === "EIGHTEEN" || content.rating === "P13";
  await notifyModerators({
    eventType: isSensitiveRating ? "CONTENT_FLAGGED" : "CONTENT_SUBMITTED",
    title: isSensitiveRating ? `⚠️ Needs review (${content.rating === "EIGHTEEN" ? "18+" : "P13"}): ${content.title}` : `New upload awaiting review: ${content.title}`,
    body: isSensitiveRating ? "Flagged for its age rating — please review before approving." : undefined,
    linkUrl: "/admin/moderation",
  });
}

// Moves content out of DRAFT into the moderation pipeline (Section 22).
// Platform uploads wait for transcoding to finish (see the transcode
// worker), everything else goes straight to UNDER_REVIEW.
export async function submitContentForReview(contentId: string) {
  const content = await prisma.content.findUniqueOrThrow({ where: { id: contentId }, include: { videoAssets: true } });
  const asset = content.videoAssets[0];

  const nextStatus = asset?.sourceType === "PLATFORM" && !asset.hlsManifestKey ? "PROCESSING" : "UNDER_REVIEW";

  const updated = await prisma.content.update({ where: { id: contentId }, data: { status: nextStatus } });

  if (nextStatus === "UNDER_REVIEW") {
    await prisma.moderationCase.create({ data: { contentId, status: "PENDING" } });
    await notifyContentSubmitted(content);
  }

  return updated;
}

export async function listMyContent(channelIds: string[]) {
  return prisma.content.findMany({
    where: { channelId: { in: channelIds }, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { videoAssets: true, category: true },
  });
}

export async function archiveContent(contentId: string) {
  return prisma.content.update({ where: { id: contentId }, data: { status: "ARCHIVED", deletedAt: null } });
}

// Real removal, distinct from archiveContent (which just hides new plays
// while keeping the title around/re-publishable). Soft-deletes the row —
// every catalogue/creator-studio query already filters deletedAt: null —
// and best-effort cleans up the underlying storage objects so a deleted
// upload doesn't just sit there eating disk on a local single-machine
// deployment. Each object delete is independent: a missing/already-gone key
// must never block removing the rest or the content row itself.
export async function deleteContent(contentId: string) {
  const content = await prisma.content.findUniqueOrThrow({
    where: { id: contentId },
    include: { videoAssets: { include: { renditions: true, subtitles: true } } },
  });

  const storage = getStorageProvider();
  const cleanup = async (bucket: Parameters<typeof storage.deleteAsset>[0], key: string | null | undefined) => {
    if (!key) return;
    await storage.deleteAsset(bucket, key).catch(() => {});
  };

  for (const asset of content.videoAssets) {
    await cleanup("masters", asset.masterStorageKey);
    await cleanup("transcoded", asset.hlsManifestKey);
    await cleanup("thumbnails", asset.thumbnailStorageKey);
    await cleanup("previews", asset.previewStorageKey);
    for (const rendition of asset.renditions) await cleanup("transcoded", rendition.storageKey);
    for (const subtitle of asset.subtitles) await cleanup("subtitles", subtitle.storageKey);
  }

  return prisma.content.update({ where: { id: contentId }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
}

export async function createSeries(channelId: string, title: string, description?: string) {
  const slug = await uniqueSlug(title, async (s) => !!(await prisma.series.findUnique({ where: { slug: s } })));
  return prisma.series.create({ data: { channelId, title, slug, description } });
}

export async function listChannelSeriesFull(channelIds: string[]) {
  return prisma.series.findMany({
    where: { channelId: { in: channelIds }, deletedAt: null },
    include: { seasons: { orderBy: { seasonNumber: "asc" }, include: { episodes: { orderBy: { episodeNumber: "asc" }, include: { content: { select: { title: true, status: true } } } } } } },
  });
}

export async function createSeason(seriesId: string, seasonNumber: number, title?: string) {
  return prisma.season.create({ data: { seriesId, seasonNumber, title } });
}

export async function attachEpisode(seasonId: string, contentId: string, episodeNumber: number) {
  await prisma.content.update({ where: { id: contentId }, data: { contentType: "EPISODE" } });
  return prisma.episode.create({ data: { seasonId, contentId, episodeNumber } });
}

export async function listUnassignedContent(channelIds: string[]) {
  return prisma.content.findMany({
    where: { channelId: { in: channelIds }, deletedAt: null, episode: null },
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
  });
}
