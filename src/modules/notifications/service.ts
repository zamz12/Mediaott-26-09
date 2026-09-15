import { prisma } from "@/lib/prisma";
import { getNotificationProvider } from "@/lib/providers";
import type { NotificationEventType } from "@prisma/client";

const RECENT_LIMIT = 8;

export async function getNotificationSummary(userId: string) {
  const [unreadCount, recent] = await Promise.all([
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: RECENT_LIMIT }),
  ]);
  return { unreadCount, recent };
}

export async function listNotifications(userId: string, limit = 50) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { isRead: true } });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

// The set of admins who should hear about moderation-relevant events —
// anyone who can actually act on them (Super Admin, Moderator, Content
// Admin), not every ADMIN-role account (e.g. a Finance Admin doesn't need a
// "video needs review" ping).
async function getModeratorAdminIds(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: {
      deletedAt: null,
      userRoles: { some: { role: { name: "ADMIN" } } },
      adminSubRoles: { some: { subRole: { in: ["SUPER_ADMIN", "MODERATOR", "CONTENT_ADMIN"] } } },
    },
    select: { id: true },
  });
  return admins.map((a) => a.id);
}

export async function notifyModerators(input: { eventType: NotificationEventType; title: string; body?: string; linkUrl?: string }) {
  const adminIds = await getModeratorAdminIds();
  await Promise.all(
    adminIds.map((userId) =>
      getNotificationProvider().send({ userId, eventType: input.eventType, channel: "IN_APP", title: input.title, body: input.body, linkUrl: input.linkUrl }),
    ),
  );
}
