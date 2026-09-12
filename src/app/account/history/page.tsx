import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { VideoCard } from "@/components/video/video-card";
import { resolveCardMedia } from "@/modules/media/preview";

export const metadata = { title: "Watch History" };

export default async function WatchHistoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/account/history");

  const history = await prisma.watchHistory.findMany({
    where: { userId: user.id },
    orderBy: { watchedAt: "desc" },
    take: 40,
    distinct: ["contentId"],
    include: {
      content: {
        include: { videoAssets: { select: { previewStorageKey: true, thumbnailStorageKey: true }, take: 1 } },
      },
    },
  });

  const cards = await Promise.all(
    history.map(async (h) => {
      const media = await resolveCardMedia(h.content);
      return { slug: h.content.slug, title: h.content.title, posterUrl: h.content.posterUrl ?? media.thumbnailUrl, previewUrl: media.previewUrl };
    }),
  );

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Watch History</h1>
      {cards.length === 0 ? (
        <p className="text-sm text-[var(--color-fg-muted)]">You haven&apos;t watched anything yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {cards.map((card) => (
            <VideoCard key={card.slug} data={card} />
          ))}
        </div>
      )}
    </div>
  );
}
