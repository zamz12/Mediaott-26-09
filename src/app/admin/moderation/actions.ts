"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { assert, canModerate } from "@/lib/rbac";
import { decideModerationCase } from "@/modules/moderation/service";
import { logAdminAction } from "@/modules/admin/audit";
import type { ModerationStatus, ViolationSeverity } from "@prisma/client";

export async function decideModerationCaseAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canModerate(admin), "You don't have moderation permissions.");

  const moderationCaseId = formData.get("moderationCaseId") as string;
  const decision = formData.get("decision") as ModerationStatus;
  const moderatorNotes = (formData.get("moderatorNotes") as string) || undefined;
  const violationSeverity = (formData.get("violationSeverity") as ViolationSeverity) || undefined;

  await decideModerationCase({ moderationCaseId, decision, moderatorNotes, adminId: admin.id, violationSeverity });
  await logAdminAction(admin.id, "moderation.decide", "ModerationCase", moderationCaseId, { decision, moderatorNotes });
  revalidatePath("/admin/moderation");
}
