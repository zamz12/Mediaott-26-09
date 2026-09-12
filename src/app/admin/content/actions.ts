"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { assert, canModerate } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { decideModerationCase } from "@/modules/moderation/service";
import { logAdminAction } from "@/modules/admin/audit";
import type { ModerationStatus } from "@prisma/client";

export async function adminDirectDecisionAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canModerate(admin));

  const contentId = formData.get("contentId") as string;
  const decision = formData.get("decision") as ModerationStatus;

  let moderationCase = await prisma.moderationCase.findFirst({ where: { contentId, status: "PENDING" } });
  if (!moderationCase) {
    moderationCase = await prisma.moderationCase.create({ data: { contentId, status: "PENDING" } });
  }

  await decideModerationCase({ moderationCaseId: moderationCase.id, decision, adminId: admin.id, moderatorNotes: "Direct admin action" });
  await logAdminAction(admin.id, "content.direct_decision", "Content", contentId, { decision });
  revalidatePath("/admin/content");
}
