import { prisma } from "@/lib/prisma";

export async function getAdminDashboard() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    registeredUsers,
    activeUsers,
    creators,
    channels,
    videos,
    watchSecondsAgg,
    storageAssets,
    uploadsToday,
    moderationBacklog,
    reportedContent,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, loginHistory: { some: { createdAt: { gte: since30d }, success: true } } } }),
    prisma.userRole.count({ where: { role: { name: "CREATOR" } } }),
    prisma.channel.count({ where: { deletedAt: null } }),
    prisma.content.count({ where: { deletedAt: null } }),
    prisma.watchProgress.aggregate({ _sum: { positionSeconds: true } }),
    prisma.storageAsset.aggregate({ _sum: { sizeBytes: true } }),
    prisma.uploadSession.count({ where: { createdAt: { gte: since24h } } }),
    prisma.moderationCase.count({ where: { status: "PENDING" } }),
    prisma.report.count({ where: { status: "OPEN" } }),
  ]);

  return {
    registeredUsers,
    activeUsers,
    creators,
    channels,
    videos,
    totalViewingHours: Math.round(((watchSecondsAgg._sum.positionSeconds ?? 0) / 3600) * 10) / 10,
    liveViewers: 0,
    storageConsumedBytes: storageAssets._sum.sizeBytes ?? BigInt(0),
    uploadsToday,
    moderationBacklog,
    reportedContent,
    systemHealth: "OK" as const,
  };
}
