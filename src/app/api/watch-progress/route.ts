import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { upsertWatchProgress } from "@/modules/library/service";
import { logAnalyticsEvent } from "@/modules/analytics/service";

const bodySchema = z.object({
  contentId: z.string(),
  positionSeconds: z.number().min(0),
  durationSeconds: z.number().min(0).optional(),
  event: z.enum(["PLAY", "PAUSE", "PROGRESS", "COMPLETE"]).default("PROGRESS"),
});

// Client debounces calls to this endpoint (Section 38) — never one write per
// second of playback. upsertWatchProgress replaces a single row per user+content.
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { contentId, positionSeconds, durationSeconds, event } = parsed.data;
  await upsertWatchProgress(user.id, contentId, Math.round(positionSeconds), durationSeconds ? Math.round(durationSeconds) : undefined);

  const eventTypeMap = { PLAY: "VIDEO_PLAY", PAUSE: "VIDEO_PAUSE", PROGRESS: "WATCH_PROGRESS", COMPLETE: "VIDEO_COMPLETE" } as const;
  await logAnalyticsEvent({ eventType: eventTypeMap[event], userId: user.id, contentId, metadata: { positionSeconds } });

  return NextResponse.json({ ok: true });
}
