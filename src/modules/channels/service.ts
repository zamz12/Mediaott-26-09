import { prisma } from "@/lib/prisma";
import type { NotificationPreference } from "@prisma/client";
import { PUBLIC_VISIBILITY_FILTER } from "@/modules/catalogue/visibility";
import { getNotificationProvider } from "@/lib/providers";

export async function listChannels() {
  return prisma.channel.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { subscriptions: true, content: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getChannelBySlug(slug: string) {
  return prisma.channel.findFirst({
    where: { slug, deletedAt: null },
    include: {
      organisation: true,
      ownerUser: { select: { displayName: true } },
      _count: { select: { subscriptions: true } },
    },
  });
}

export async function listChannelContent(channelId: string) {
  return prisma.content.findMany({
    where: { channelId, status: "PUBLISHED", visibility: PUBLIC_VISIBILITY_FILTER, deletedAt: null },
    orderBy: { publishedAt: "desc" },
    include: {
      channel: { select: { name: true, slug: true } },
      originalLanguage: true,
      genres: { include: { genre: true } },
      videoAssets: { select: { previewStorageKey: true, thumbnailStorageKey: true }, take: 1 },
    },
  });
}

export async function listChannelSeries(channelId: string) {
  return prisma.series.findMany({ where: { channelId, deletedAt: null }, include: { seasons: { include: { episodes: true } } } });
}

export async function getSubscription(userId: string, channelId: string) {
  return prisma.channelSubscription.findUnique({ where: { channelId_userId: { channelId, userId } } });
}

export async function subscribeToChannel(userId: string, channelId: string, notify: NotificationPreference = "ALL") {
  const existing = await prisma.channelSubscription.findUnique({ where: { channelId_userId: { channelId, userId } } });

  const subscription = await prisma.channelSubscription.upsert({
    where: { channelId_userId: { channelId, userId } },
    update: { notify },
    create: { channelId, userId, notify },
  });

  if (!existing) {
    const [follower, channel] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
      prisma.channel.findUnique({ where: { id: channelId }, select: { ownerUserId: true, slug: true } }),
    ]);
    if (channel?.ownerUserId && channel.ownerUserId !== userId) {
      await getNotificationProvider().send({
        userId: channel.ownerUserId,
        eventType: "CREATOR_FOLLOWED",
        channel: "IN_APP",
        title: `${follower?.displayName ?? "Someone"} followed your channel`,
        linkUrl: `/channels/${channel.slug}`,
      });
    }
  }

  return subscription;
}

export async function unsubscribeFromChannel(userId: string, channelId: string) {
  await prisma.channelSubscription.deleteMany({ where: { channelId, userId } });
}
