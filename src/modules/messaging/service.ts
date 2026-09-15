import { prisma } from "@/lib/prisma";
import { getNotificationProvider } from "@/lib/providers";
import { ForbiddenError } from "@/lib/rbac";

// Admins are always reachable — the platform's default contact for support,
// disputes, and anything a creator/viewer can't resolve with another user.
// Prefers a Super Admin so there's always a single, stable "the" admin.
export async function getDefaultAdminContact() {
  const superAdmin = await prisma.user.findFirst({
    where: { deletedAt: null, adminSubRoles: { some: { subRole: "SUPER_ADMIN" } } },
    select: { id: true, displayName: true, handle: true },
  });
  if (superAdmin) return superAdmin;
  return prisma.user.findFirst({
    where: { deletedAt: null, userRoles: { some: { role: { name: "ADMIN" } } } },
    select: { id: true, displayName: true, handle: true },
  });
}

// Messaging is scoped, not open DMs to anyone on the platform: a pair of
// users can message each other once either one follows the other's
// channel, and anyone can always reach an admin (support contact).
async function canMessage(senderId: string, recipientId: string): Promise<boolean> {
  if (senderId === recipientId) return false;

  const recipientIsAdmin = await prisma.user.findFirst({
    where: { id: recipientId, userRoles: { some: { role: { name: "ADMIN" } } } },
    select: { id: true },
  });
  if (recipientIsAdmin) return true;

  const senderIsAdmin = await prisma.user.findFirst({
    where: { id: senderId, userRoles: { some: { role: { name: "ADMIN" } } } },
    select: { id: true },
  });
  if (senderIsAdmin) return true;

  const follows = await prisma.channelSubscription.findFirst({
    where: {
      OR: [
        { userId: senderId, channel: { ownerUserId: recipientId } },
        { userId: recipientId, channel: { ownerUserId: senderId } },
      ],
    },
  });
  return !!follows;
}

export async function sendMessage(senderId: string, recipientId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message can't be empty.");
  if (!(await canMessage(senderId, recipientId))) {
    throw new ForbiddenError("You can only message someone who follows your channel, someone you follow, or an admin.");
  }

  const message = await prisma.message.create({ data: { senderId, recipientId, body: trimmed } });

  const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { displayName: true } });
  await getNotificationProvider().send({
    userId: recipientId,
    eventType: "NEW_MESSAGE",
    channel: "IN_APP",
    title: `New message from ${sender?.displayName ?? "someone"}`,
    body: trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed,
    linkUrl: `/messages/${senderId}`,
  });

  return message;
}

// One row per other-party conversation, latest message + unread count —
// the inbox list, not a full thread.
export async function listConversations(userId: string) {
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, displayName: true, handle: true } },
      recipient: { select: { id: true, displayName: true, handle: true } },
    },
  });

  const byOtherParty = new Map<string, { otherParty: { id: string; displayName: string; handle: string }; lastMessage: (typeof messages)[number]; unreadCount: number }>();
  for (const m of messages) {
    const otherParty = m.senderId === userId ? m.recipient : m.sender;
    const existing = byOtherParty.get(otherParty.id);
    const isUnreadForMe = m.recipientId === userId && !m.isRead;
    if (!existing) {
      byOtherParty.set(otherParty.id, { otherParty, lastMessage: m, unreadCount: isUnreadForMe ? 1 : 0 });
    } else if (isUnreadForMe) {
      existing.unreadCount += 1;
    }
  }

  return Array.from(byOtherParty.values());
}

export async function getUnreadMessageCount(userId: string) {
  return prisma.message.count({ where: { recipientId: userId, isRead: false } });
}

export async function listThread(userId: string, otherUserId: string) {
  return prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: userId },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function markThreadRead(userId: string, otherUserId: string) {
  await prisma.message.updateMany({ where: { senderId: otherUserId, recipientId: userId, isRead: false }, data: { isRead: true } });
}
