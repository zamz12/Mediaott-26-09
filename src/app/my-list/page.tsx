import { redirect } from "next/navigation";
import { VideoCard } from "@/components/video/video-card";
import { EmptyWatchlist } from "@/components/empty-states";
import { getSessionUser } from "@/lib/session";
import { getWatchlistItems } from "@/modules/library/service";
import { resolveCardMedia } from "@/modules/media/preview";

export const metadata = { title: "My List" };

export default async function MyListPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/my-list");

  const items = await getWatchlistItems(user.id);
  const cards = await Promise.all(
    items.map(async (item) => {
      const media = await resolveCardMedia(item.content);
      return {
        slug: item.content.slug,
        title: item.content.title,
        posterUrl: item.content.posterUrl ?? media.thumbnailUrl,
        previewUrl: media.previewUrl,
      };
    }),
  );

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">My List</h1>
      {cards.length === 0 ? (
        <EmptyWatchlist />
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
