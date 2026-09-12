import { getStorageProvider } from "@/lib/providers";
import type { ContentCard } from "@/modules/catalogue/service";

// Never expose a permanent storage URL (Section 15). Card/hover-preview
// media is always served through a short-lived signed URL, resolved at
// render time — this is cheap (local HMAC or SDK-local signing, no network
// round-trip) even for a full rail of cards.
export interface ResolvedCardMedia {
  previewUrl: string | null;
  thumbnailUrl: string | null;
}

export async function resolveCardMedia(card: Pick<ContentCard, "videoAssets" | "posterUrl">): Promise<ResolvedCardMedia> {
  const asset = card.videoAssets[0];
  const storage = getStorageProvider();

  const [previewUrl, thumbnailUrl] = await Promise.all([
    asset?.previewStorageKey ? storage.getSignedReadUrl("previews", asset.previewStorageKey, 600).catch(() => null) : Promise.resolve(null),
    asset?.thumbnailStorageKey ? storage.getSignedReadUrl("thumbnails", asset.thumbnailStorageKey, 600).catch(() => null) : Promise.resolve(null),
  ]);

  return { previewUrl, thumbnailUrl };
}
