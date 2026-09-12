import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { logAnalyticsEvent } from "@/modules/analytics/service";
import { prisma } from "@/lib/prisma";

// Fired once per hover-preview play (Section 7/38) — not on every frame.
export async function POST(req: NextRequest) {
  const { slug } = await req.json();
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const [user, content] = await Promise.all([getSessionUser(), prisma.content.findFirst({ where: { slug }, select: { id: true } })]);
  if (!content) return NextResponse.json({ ok: true });

  await logAnalyticsEvent({ eventType: "PREVIEW_PLAY", userId: user?.id, contentId: content.id });
  return NextResponse.json({ ok: true });
}
