import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/providers";
import type { SessionUser } from "@/lib/rbac";

export class PlaybackForbiddenError extends Error {
  constructor(message = "You don't have access to this video.") {
    super(message);
  }
}

// Distinct from a hard forbid: the viewer just needs to click through a
// one-time age confirmation (Section 22's rating system, applied at
// playback rather than at browse time — the title still appears in
// search/homepage rows like any other public content).
export class AgeVerificationRequiredError extends PlaybackForbiddenError {
  constructor() {
    super("This content is restricted to viewers 18 and older.");
  }
}

export interface PlaybackSource {
  kind: "HLS" | "EXTERNAL_YOUTUBE" | "EXTERNAL_VIMEO" | "EXTERNAL_OTHER" | "LIVE";
  manifestUrl?: string;
  externalVideoId?: string;
  embedUrl?: string;
}

export interface PlaybackPayload {
  contentId: string;
  title: string;
  source: PlaybackSource;
  subtitles: { languageCode: string; label: string; url: string }[];
  posterUrl: string | null;
  resumePositionSeconds: number;
  durationSeconds: number | null;
}

export interface PlaybackOptions {
  /** Set once the viewer has clicked through the 18+ interstitial (Section 22/31). */
  ageConfirmed?: boolean;
}

// Enforces Visibility rules server-side and issues short-lived signed URLs
// only at request time (Section 15/17/31) — never a stored permanent URL.
export async function getPlaybackPayload(user: SessionUser | null, slug: string, options: PlaybackOptions = {}): Promise<PlaybackPayload> {
  const content = await prisma.content.findFirst({
    where: { slug, deletedAt: null },
    include: {
      channel: true,
      videoAssets: { include: { subtitles: { include: { language: true } } }, take: 1 },
    },
  });

  if (!content) throw new PlaybackForbiddenError("This video isn't available yet.");

  const isOwner = user?.id === content.createdByUserId;
  const isAdmin = !!user?.roles.includes("ADMIN");

  // Owners/admins can preview their own upload as soon as it has a playable
  // source (PROCESSING/UNDER_REVIEW/etc.) — the "quick check" link from the
  // content editor — everyone else still needs it READY/PUBLISHED.
  if (!["READY", "PUBLISHED"].includes(content.status) && !isOwner && !isAdmin) {
    throw new PlaybackForbiddenError("This video isn't available yet.");
  }

  switch (content.visibility) {
    case "PUBLIC":
    case "UNLISTED":
      break;
    case "PUBLIC_18_PLUS":
      if (!options.ageConfirmed) throw new AgeVerificationRequiredError();
      break;
    case "PRIVATE":
      if (!isOwner && !isAdmin) throw new PlaybackForbiddenError();
      break;
    case "REGULATORY_HOLD":
      if (!isOwner && !isAdmin) throw new PlaybackForbiddenError("This content is under regulatory hold.");
      break;
    case "MEMBERS_ONLY":
      if (!user || (user.subscriptionTier === "FREE" && !isOwner)) throw new PlaybackForbiddenError("Members-only content.");
      break;
    case "SUBSCRIBERS_ONLY": {
      if (isOwner || isAdmin) break;
      const subscription = user
        ? await prisma.channelSubscription.findUnique({ where: { channelId_userId: { channelId: content.channelId, userId: user.id } } })
        : null;
      if (!subscription) throw new PlaybackForbiddenError("This video is for subscribers of this channel only.");
      break;
    }
    case "ORGANISATION_ONLY": {
      if (isOwner) break;
      const membership = content.channel.organisationId && user
        ? await prisma.organisationMember.findFirst({ where: { organisationId: content.channel.organisationId, userId: user.id } })
        : null;
      if (!membership) throw new PlaybackForbiddenError("This video is restricted to organisation members.");
      break;
    }
    case "SCHEDULED":
      if (!content.scheduledAt || content.scheduledAt > new Date()) throw new PlaybackForbiddenError("This video hasn't premiered yet.");
      break;
  }

  const asset = content.videoAssets[0];
  if (!asset) throw new PlaybackForbiddenError("This video has no playable source.");

  const storage = getStorageProvider();
  let source: PlaybackSource;

  if (asset.sourceType === "EXTERNAL") {
    source = {
      kind: asset.externalProvider === "YOUTUBE" ? "EXTERNAL_YOUTUBE" : asset.externalProvider === "VIMEO" ? "EXTERNAL_VIMEO" : "EXTERNAL_OTHER",
      externalVideoId: asset.externalVideoId ?? undefined,
    };
  } else if (asset.sourceType === "LIVE") {
    const live = asset.liveStreamId ? await prisma.liveStream.findUnique({ where: { id: asset.liveStreamId } }) : null;
    source = { kind: "LIVE", manifestUrl: live?.playbackUrl ?? undefined, embedUrl: live?.externalEmbedUrl ?? undefined };
  } else {
    if (!asset.hlsManifestKey) throw new PlaybackForbiddenError("This video is still processing.");
    source = { kind: "HLS", manifestUrl: await storage.getSignedReadUrl("transcoded", asset.hlsManifestKey) };
  }

  const subtitles = await Promise.all(
    asset.subtitles
      .filter((s) => s.isReviewed || s.source === "UPLOADED")
      .map(async (s) => ({
        languageCode: s.language.code,
        label: s.language.label,
        url: await storage.getSignedReadUrl("subtitles", s.storageKey),
      })),
  );

  let resumePositionSeconds = 0;
  if (user) {
    const progress = await prisma.watchProgress.findUnique({ where: { userId_contentId: { userId: user.id, contentId: content.id } } });
    if (progress && !progress.completed) resumePositionSeconds = progress.positionSeconds;
  }

  return {
    contentId: content.id,
    title: content.title,
    source,
    subtitles,
    posterUrl: content.posterUrl,
    resumePositionSeconds,
    durationSeconds: asset.durationSeconds ?? content.durationSeconds,
  };
}
