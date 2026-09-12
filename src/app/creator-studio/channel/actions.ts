"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { createChannel, getMyChannels, updateChannel } from "@/modules/media/service";

export async function createChannelAction(formData: FormData) {
  const user = await requireSessionUser();
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  await createChannel(user.id, name, description);
  redirect("/creator-studio");
}

export async function updateChannelAction(formData: FormData) {
  const user = await requireSessionUser();
  const [channel] = await getMyChannels(user.id);
  if (!channel) throw new Error("No channel found");

  await updateChannel(channel.id, {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    bannerUrl: (formData.get("bannerUrl") as string) || undefined,
    avatarUrl: (formData.get("avatarUrl") as string) || undefined,
  });
  revalidatePath("/creator-studio/channel");
}
