import { prisma } from "@/lib/prisma";

const COMPLETION_THRESHOLD_PCT = 0.9; // Section 17: mark complete around 90–95%

export async function getOrCreateWatchlist(userId: string) {
  const existing = await prisma.playlist.findFirst({ where: { userId, isWatchlist: true } });
  if (existing) return existing;
  return prisma.playlist.create({ data: { userId, name: "My List", isWatchlist: true } });
}

export async function isInWatchlist(userId: string, contentId: string): Promise<boolean> {
  const watchlist = await getOrCreateWatchlist(userId);
  const item = await prisma.playlistItem.findUnique({
    where: { playlistId_contentId: { playlistId: watchlist.id, contentId } },
  });
  return !!item;
}

export async function toggleWatchlistItem(userId: string, contentId: string): Promise<boolean> {
  const watchlist = await getOrCreateWatchlist(userId);
  const existing = await prisma.playlistItem.findUnique({
    where: { playlistId_contentId: { playlistId: watchlist.id, contentId } },
  });

  if (existing) {
    await prisma.playlistItem.delete({ where: { id: existing.id } });
    return false;
  }

  await prisma.playlistItem.create({ data: { playlistId: watchlist.id, contentId } });
  return true;
}

export async function getWatchlistItems(userId: string) {
  const watchlist = await getOrCreateWatchlist(userId);
  return prisma.playlistItem.findMany({
    where: { playlistId: watchlist.id },
    orderBy: { addedAt: "desc" },
    include: {
      content: {
        include: {
          originalLanguage: true,
          videoAssets: { select: { previewStorageKey: true, thumbnailStorageKey: true }, take: 1 },
        },
      },
    },
  });
}

// Debounced/batched on the client (Section 38) — this upserts a single row
// per (user, content) rather than writing every second of playback.
export async function upsertWatchProgress(userId: string, contentId: string, positionSeconds: number, durationSeconds?: number) {
  const completed = durationSeconds ? positionSeconds / durationSeconds >= COMPLETION_THRESHOLD_PCT : false;

  await prisma.watchProgress.upsert({
    where: { userId_contentId: { userId, contentId } },
    update: { positionSeconds, durationSeconds, completed },
    create: { userId, contentId, positionSeconds, durationSeconds, completed },
  });

  await prisma.watchHistory.create({ data: { userId, contentId } });
}

export async function getWatchProgress(userId: string, contentId: string) {
  return prisma.watchProgress.findUnique({ where: { userId_contentId: { userId, contentId } } });
}
