import { prisma } from "@/lib/prisma";
import type { AnalyticsEventType, Prisma } from "@prisma/client";

export interface CreatorDashboard {
  totalVideos: number;
  publishedVideos: number;
  totalViews: number;
  uniqueViewers: number;
  watchHours: number;
  subscribers: number;
  completionRatePct: number;
  topVideos: { contentId: string; title: string; slug: string; views: number }[];
}

// Views-clocking mechanism (Section 38): every playback start already logs a
// VIDEO_PLAY event (src/components/video/player.tsx); this just aggregates
// them for display. Deliberately a simple count, not a new counter column,
// so it stays consistent with everywhere else views are computed (creator
// dashboard, TRENDING homepage algorithm).
export async function getContentViewCount(contentId: string): Promise<number> {
  return prisma.analyticsEvent.count({ where: { eventType: "VIDEO_PLAY", contentId } });
}

// Creator Studio dashboard KPIs (Section 23). Deliberately built from the
// same AnalyticsEvent/WatchProgress tables the admin dashboard reads —
// one internal analytics pipeline, not a bolt-on for creators.
export async function getCreatorDashboard(channelIds: string[]): Promise<CreatorDashboard> {
  if (channelIds.length === 0) {
    return { totalVideos: 0, publishedVideos: 0, totalViews: 0, uniqueViewers: 0, watchHours: 0, subscribers: 0, completionRatePct: 0, topVideos: [] };
  }

  const ownedContent = await prisma.content.findMany({ where: { channelId: { in: channelIds }, deletedAt: null }, select: { id: true, status: true } });
  const contentIds = ownedContent.map((c) => c.id);

  const [viewEvents, uniqueViewerRows, progressRows, subscribers, topVideosGrouped] = await Promise.all([
    prisma.analyticsEvent.count({ where: { eventType: "VIDEO_PLAY", contentId: { in: contentIds } } }),
    prisma.analyticsEvent.findMany({ where: { eventType: "VIDEO_PLAY", contentId: { in: contentIds }, userId: { not: null } }, distinct: ["userId"], select: { userId: true } }),
    prisma.watchProgress.findMany({ where: { contentId: { in: contentIds } }, select: { positionSeconds: true, completed: true } }),
    prisma.channelSubscription.count({ where: { channelId: { in: channelIds } } }),
    prisma.analyticsEvent.groupBy({
      by: ["contentId"],
      where: { eventType: "VIDEO_PLAY", contentId: { in: contentIds } },
      _count: { contentId: true },
      orderBy: { _count: { contentId: "desc" } },
      take: 5,
    }),
  ]);

  const watchHours = progressRows.reduce((sum, p) => sum + p.positionSeconds, 0) / 3600;
  const completionRatePct = progressRows.length > 0 ? (progressRows.filter((p) => p.completed).length / progressRows.length) * 100 : 0;

  const topContents = await prisma.content.findMany({ where: { id: { in: topVideosGrouped.map((g) => g.contentId!) } }, select: { id: true, title: true, slug: true } });
  const topVideos = topVideosGrouped.map((g) => {
    const c = topContents.find((tc) => tc.id === g.contentId)!;
    return { contentId: g.contentId!, title: c?.title ?? "Untitled", slug: c?.slug ?? "", views: g._count.contentId };
  });

  return {
    totalVideos: ownedContent.length,
    publishedVideos: ownedContent.filter((c) => c.status === "PUBLISHED").length,
    totalViews: viewEvents,
    uniqueViewers: uniqueViewerRows.length,
    watchHours: Math.round(watchHours * 10) / 10,
    subscribers,
    completionRatePct: Math.round(completionRatePct),
    topVideos,
  };
}

export interface LogEventInput {
  eventType: AnalyticsEventType;
  userId?: string;
  contentId?: string;
  channelId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

// Internal analytics event architecture (Section 38). Fire-and-forget: a
// dropped analytics write must never break the viewer-facing request.
export async function logAnalyticsEvent(input: LogEventInput): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType: input.eventType,
        userId: input.userId,
        contentId: input.contentId,
        channelId: input.channelId,
        sessionId: input.sessionId,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("analytics event failed", err);
  }
}
