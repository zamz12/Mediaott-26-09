"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { becomeCreator } from "@/modules/users/service";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/lib/auth";

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function becomeCreatorAction() {
  const user = await requireSessionUser();
  await becomeCreator(user.id);
  revalidatePath("/account");
}

export async function updatePreferredLanguageAction(formData: FormData) {
  const user = await requireSessionUser();
  const languageId = formData.get("languageId") as string;

  await prisma.profile.update({
    where: { userId: user.id },
    data: { preferredLanguageId: languageId || null },
  });
  revalidatePath("/account");
}

export async function revokeDeviceSessionAction(formData: FormData) {
  const user = await requireSessionUser();
  const sessionId = formData.get("sessionId") as string;

  await prisma.deviceSession.updateMany({
    where: { id: sessionId, userId: user.id },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/account");
}
