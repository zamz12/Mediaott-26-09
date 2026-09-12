"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { assert, canManageFinance } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { SubscriptionTier } from "@prisma/client";
import { logAdminAction } from "@/modules/admin/audit";

export async function createPlanAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canManageFinance(admin));

  const name = formData.get("name") as string;
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const tier = formData.get("tier") as SubscriptionTier;
  const billingPeriod = (formData.get("billingPeriod") as string) || null;
  const priceCents = Number(formData.get("priceCents") ?? 0);

  const plan = await prisma.subscriptionPlan.create({
    data: { key, name, tier, billingPeriod, priceCents, isActive: false },
  });
  await logAdminAction(admin.id, "subscription_plan.create", "SubscriptionPlan", plan.id, { name, tier });
  revalidatePath("/admin/subscriptions");
}
