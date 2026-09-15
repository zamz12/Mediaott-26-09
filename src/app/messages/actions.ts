"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { sendMessage, markThreadRead } from "@/modules/messaging/service";

export async function sendMessageAction(recipientId: string, formData: FormData) {
  const user = await requireSessionUser();
  const body = formData.get("body") as string;
  await sendMessage(user.id, recipientId, body);
  revalidatePath(`/messages/${recipientId}`);
  revalidatePath("/messages");
}

export async function markThreadReadAction(otherUserId: string) {
  const user = await requireSessionUser();
  await markThreadRead(user.id, otherUserId);
  revalidatePath("/messages");
}
