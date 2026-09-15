"use server";

import { requireSessionUser } from "@/lib/session";
import { updateAppearance } from "@/modules/users/service";

export async function updateAppearanceAction(data: { palette?: string; uiScale?: string }) {
  const user = await requireSessionUser();
  await updateAppearance(user.id, data);
}
