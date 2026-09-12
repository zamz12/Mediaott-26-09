"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getMyChannels } from "@/modules/media/service";

export async function createChannelPlaylistAction(formData: FormData) {
  const user = await requireSessionUser();
  const [channel] = await getMyChannels(user.id);
  if (!channel) throw new Error("Create a channel first.");
  await prisma.playlist.create({ data: { channelId: channel.id, name: formData.get("name") as string } });
  revalidatePath("/creator-studio/playlists");
}

export async function addToPlaylistAction(formData: FormData) {
  const playlistId = formData.get("playlistId") as string;
  const contentId = formData.get("contentId") as string;
  await prisma.playlistItem.upsert({
    where: { playlistId_contentId: { playlistId, contentId } },
    update: {},
    create: { playlistId, contentId },
  });
  revalidatePath("/creator-studio/playlists");
}
