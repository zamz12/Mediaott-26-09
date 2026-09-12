"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { toggleWatchlistItem } from "@/modules/library/service";
import { postComment, submitReport, toggleReaction } from "@/modules/moderation/service";
import { logAnalyticsEvent } from "@/modules/analytics/service";
import type { ReportReason } from "@prisma/client";

export async function toggleWatchlistAction(contentId: string, slug: string) {
  const user = await requireSessionUser();
  const added = await toggleWatchlistItem(user.id, contentId);
  if (added) await logAnalyticsEvent({ eventType: "ADD_TO_WATCHLIST", userId: user.id, contentId });
  revalidatePath(`/title/${slug}`);
}

export async function toggleReactionAction(contentId: string, slug: string, type: "LIKE" | "DISLIKE") {
  const user = await requireSessionUser();
  const result = await toggleReaction(user.id, contentId, type);
  if (result?.type === "LIKE") await logAnalyticsEvent({ eventType: "CONTENT_LIKE", userId: user.id, contentId });
  revalidatePath(`/title/${slug}`);
}

export async function submitReportAction(formData: FormData) {
  const user = await requireSessionUser();
  const contentId = formData.get("contentId") as string;
  const reason = formData.get("reason") as ReportReason;
  const details = formData.get("details") as string | undefined;
  await submitReport(user.id, contentId, reason, details);
}

export async function postCommentAction(formData: FormData) {
  const user = await requireSessionUser();
  const contentId = formData.get("contentId") as string;
  const slug = formData.get("slug") as string;
  const body = formData.get("body") as string;
  if (body.trim().length === 0) return;
  await postComment(user.id, contentId, body.trim());
  revalidatePath(`/title/${slug}`);
}
