import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// Every important admin action must generate an audit record (Section 24).
export async function logAdminAction(actorId: string, action: string, targetType?: string, targetId?: string, metadata?: Record<string, unknown>) {
  await prisma.auditLog.create({
    data: { actorId, action, targetType, targetId, metadata: metadata as Prisma.InputJsonValue },
  });
}
