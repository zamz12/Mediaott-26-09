"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { attachEpisode, createSeason, createSeries, getMyChannels } from "@/modules/media/service";

export async function createSeriesAction(formData: FormData) {
  const user = await requireSessionUser();
  const [channel] = await getMyChannels(user.id);
  if (!channel) throw new Error("Create a channel first.");
  await createSeries(channel.id, formData.get("title") as string, (formData.get("description") as string) || undefined);
  revalidatePath("/creator-studio/series");
}

export async function createSeasonAction(formData: FormData) {
  const seriesId = formData.get("seriesId") as string;
  const seasonNumber = Number(formData.get("seasonNumber"));
  const title = (formData.get("title") as string) || undefined;
  await createSeason(seriesId, seasonNumber, title);
  revalidatePath("/creator-studio/series");
}

export async function attachEpisodeAction(formData: FormData) {
  const seasonId = formData.get("seasonId") as string;
  const contentId = formData.get("contentId") as string;
  const episodeNumber = Number(formData.get("episodeNumber"));
  await attachEpisode(seasonId, contentId, episodeNumber);
  revalidatePath("/creator-studio/series");
}
