import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getPlaybackPayload, PlaybackForbiddenError } from "@/modules/streaming/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getSessionUser();

  try {
    const payload = await getPlaybackPayload(user, slug);
    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof PlaybackForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
