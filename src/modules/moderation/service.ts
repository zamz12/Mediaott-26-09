import { prisma } from "@/lib/prisma";
import type { ModerationStatus, ReportReason, ViolationSeverity } from "@prisma/client";
import { getNotificationProvider } from "@/lib/providers";

export async function listModerationQueue() {
  return prisma.moderationCase.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      content: { include: { channel: { include: { ownerUser: true } } } },
      report: { include: { reporter: { select: { displayName: true } } } },
    },
  });
}

export interface ModerationDecisionInput {
  moderationCaseId: string;
  decision: ModerationStatus;
  moderatorNotes?: string;
  adminId: string;
  violationSeverity?: ViolationSeverity;
}

// The single place moderation decisions are applied — Section 22. Every
// decision resolves the case, updates the content's visibility/status, and
// notifies the creator, so admin/content pages never mutate status directly.
export async function decideModerationCase(input: ModerationDecisionInput) {
  const moderationCase = await prisma.moderationCase.findUniqueOrThrow({
    where: { id: input.moderationCaseId },
    include: { content: true },
  });

  const contentStatusMap: Record<ModerationStatus, "PUBLISHED" | "RESTRICTED" | "TAKEDOWN" | "UNDER_REVIEW"> = {
    APPROVED: "PUBLISHED",
    REJECTED: "RESTRICTED",
    RESTRICTED: "RESTRICTED",
    TAKEDOWN: "TAKEDOWN",
    PENDING: "UNDER_REVIEW",
  };

  await prisma.$transaction([
    prisma.moderationCase.update({
      where: { id: input.moderationCaseId },
      data: { status: input.decision, moderatorNotes: input.moderatorNotes, assignedAdminId: input.adminId, resolvedAt: new Date() },
    }),
    prisma.content.update({
      where: { id: moderationCase.contentId },
      data: {
        status: contentStatusMap[input.decision],
        // Approval preserves whatever visibility the creator already chose
        // (PUBLIC, MEMBERS_ONLY, SUBSCRIBERS_ONLY, ...) — it must never
        // force content that was deliberately set to a restricted
        // visibility (e.g. REGULATORY_HOLD) into PUBLIC.
        publishedAt: input.decision === "APPROVED" ? new Date() : moderationCase.content.publishedAt,
      },
    }),
    ...(input.violationSeverity
      ? [
          prisma.violation.create({
            data: {
              userId: moderationCase.content.createdByUserId,
              moderationCaseId: input.moderationCaseId,
              severity: input.violationSeverity,
              reason: input.moderatorNotes ?? "Moderation decision",
            },
          }),
        ]
      : []),
  ]);

  await getNotificationProvider().send({
    userId: moderationCase.content.createdByUserId,
    eventType: input.decision === "APPROVED" ? "CONTENT_APPROVED" : "CONTENT_REJECTED",
    channel: "IN_APP",
    title: input.decision === "APPROVED" ? "Your video was approved" : "Your video needs attention",
    body: input.moderatorNotes,
    linkUrl: `/creator-studio/content/${moderationCase.contentId}`,
  });
}

// Filing a report always opens (or reuses) a ModerationCase so the admin
// queue (Section 22/24) has a single place to review it.
export async function submitReport(reporterId: string, contentId: string, reason: ReportReason, details?: string) {
  const report = await prisma.report.create({
    data: { reporterId, contentId, reason, details },
  });

  await prisma.moderationCase.create({
    data: { contentId, reportId: report.id, status: "PENDING" },
  });

  return report;
}

export async function toggleReaction(userId: string, contentId: string, type: "LIKE" | "DISLIKE") {
  const existing = await prisma.reaction.findUnique({ where: { userId_contentId: { userId, contentId } } });

  if (existing && existing.type === type) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return null;
  }

  return prisma.reaction.upsert({
    where: { userId_contentId: { userId, contentId } },
    update: { type },
    create: { userId, contentId, type },
  });
}

export async function getReactionCounts(contentId: string) {
  const [likes, dislikes] = await Promise.all([
    prisma.reaction.count({ where: { contentId, type: "LIKE" } }),
    prisma.reaction.count({ where: { contentId, type: "DISLIKE" } }),
  ]);
  return { likes, dislikes };
}

export async function postComment(userId: string, contentId: string, body: string, parentId?: string) {
  return prisma.comment.create({ data: { userId, contentId, body, parentId } });
}

export async function listComments(contentId: string) {
  return prisma.comment.findMany({
    where: { contentId, parentId: null, isHidden: false, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { displayName: true, handle: true } } },
  });
}
