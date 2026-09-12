"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { assert, canModerate } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/modules/admin/audit";

export async function toggleChannelVerifiedAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canModerate(admin));
  const id = formData.get("id") as string;
  const channel = await prisma.channel.findUniqueOrThrow({ where: { id } });
  await prisma.channel.update({ where: { id }, data: { isVerified: !channel.isVerified } });
  await logAdminAction(admin.id, "channel.toggle_verified", "Channel", id);
  revalidatePath("/admin/channels");
}
