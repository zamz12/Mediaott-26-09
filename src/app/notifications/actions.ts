"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { getNotificationSummary, markAllNotificationsRead, markNotificationRead } from "@/modules/notifications/service";

export async function getNotificationSummaryAction() {
  const user = await requireSessionUser();
  return getNotificationSummary(user.id);
}

export async function markNotificationReadAction(notificationId: string) {
  const user = await requireSessionUser();
  await markNotificationRead(user.id, notificationId);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const user = await requireSessionUser();
  await markAllNotificationsRead(user.id);
  revalidatePath("/notifications");
}
