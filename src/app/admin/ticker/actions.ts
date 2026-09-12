"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { assert, canCurateHomepage } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/modules/admin/audit";

export async function createTickerAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin));

  const message = formData.get("message") as string;
  const slug = formData.get("slug") as string;
  const priority = Number(formData.get("priority") ?? 0);
  const startsAt = formData.get("startsAt") as string;
  const endsAt = formData.get("endsAt") as string;

  const destination = slug ? await prisma.content.findFirst({ where: { slug } }) : null;

  const ticker = await prisma.ticker.create({
    data: {
      message,
      destinationContentId: destination?.id,
      priority,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  });

  await logAdminAction(admin.id, "ticker.create", "Ticker", ticker.id, { message });
  revalidatePath("/admin/ticker");
  revalidatePath("/");
}

export async function toggleTickerAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin));
  const id = formData.get("id") as string;
  const ticker = await prisma.ticker.findUniqueOrThrow({ where: { id } });
  await prisma.ticker.update({ where: { id }, data: { isEnabled: !ticker.isEnabled } });
  await logAdminAction(admin.id, "ticker.toggle", "Ticker", id);
  revalidatePath("/admin/ticker");
  revalidatePath("/");
}

export async function deleteTickerAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin));
  const id = formData.get("id") as string;
  await prisma.ticker.delete({ where: { id } });
  await logAdminAction(admin.id, "ticker.delete", "Ticker", id);
  revalidatePath("/admin/ticker");
  revalidatePath("/");
}
