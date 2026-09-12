"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { subscribeToChannel, unsubscribeFromChannel } from "@/modules/channels/service";
import { logAnalyticsEvent } from "@/modules/analytics/service";
import type { NotificationPreference } from "@prisma/client";

export async function subscribeAction(channelId: string, slug: string, notify: NotificationPreference) {
  const user = await requireSessionUser();
  await subscribeToChannel(user.id, channelId, notify);
  await logAnalyticsEvent({ eventType: "CHANNEL_SUBSCRIBE", userId: user.id, channelId });
  revalidatePath(`/channels/${slug}`);
}

export async function unsubscribeAction(channelId: string, slug: string) {
  const user = await requireSessionUser();
  await unsubscribeFromChannel(user.id, channelId);
  revalidatePath(`/channels/${slug}`);
}
