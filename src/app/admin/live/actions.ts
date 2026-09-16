"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/session";
import { assert, canCurateHomepage } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "live"
  );
}

// Creates a "Live TV" title backed by an EXTERNAL_EMBED LiveStream — for
// carrying an official broadcaster's own channel embed (e.g. a state
// broadcaster's YouTube live channel), never a re-stream from an
// unlicensed aggregator. RTMP/SRT ingestion is Phase 2; this covers the
// embed case the data model already supported but had no UI to create.
export async function createLiveChannelAction(formData: FormData) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin), "You don't have permission to manage live channels.");

  const title = formData.get("title") as string;
  const channelId = formData.get("channelId") as string;
  const embedUrl = formData.get("embedUrl") as string;
  const synopsis = (formData.get("synopsis") as string) || undefined;

  new URL(embedUrl); // throws on garbage input before it ever reaches an <iframe>

  const liveStream = await prisma.liveStream.create({
    data: { ingestType: "EXTERNAL_EMBED", externalEmbedUrl: embedUrl, isLive: true, startedAt: new Date() },
  });

  const slug = `${slugify(title)}-${liveStream.id.slice(0, 6)}`;
  const content = await prisma.content.create({
    data: {
      channelId,
      createdByUserId: admin.id,
      title,
      slug,
      synopsis,
      contentType: "LIVE",
      rating: "U",
      visibility: "PUBLIC",
      status: "PUBLISHED",
      publishedAt: new Date(),
      ownsContent: true,
      authorisedToPublish: true,
    },
  });

  await prisma.videoAsset.create({ data: { contentId: content.id, sourceType: "LIVE", liveStreamId: liveStream.id } });

  revalidatePath("/admin/live");
  revalidatePath("/live");
}

export async function setLiveStatusAction(liveStreamId: string, isLive: boolean) {
  const admin = await requireSessionUser();
  assert(canCurateHomepage(admin), "You don't have permission to manage live channels.");

  await prisma.liveStream.update({
    where: { id: liveStreamId },
    data: { isLive, endedAt: isLive ? null : new Date() },
  });

  revalidatePath("/admin/live");
  revalidatePath("/live");
}
