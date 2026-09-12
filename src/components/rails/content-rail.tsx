import { VideoCard } from "@/components/video/video-card";
import { resolveCardMedia } from "@/modules/media/preview";
import type { ContentCard } from "@/modules/catalogue/service";

export async function ContentRail({ title, items }: { title: string; items: ContentCard[] }) {
  if (items.length === 0) return null;

  const cards = await Promise.all(
    items.map(async (item) => {
      const media = await resolveCardMedia(item);
      return {
        slug: item.slug,
        title: item.title,
        posterUrl: item.posterUrl ?? media.thumbnailUrl,
        previewUrl: media.previewUrl,
        languageLabel: item.originalLanguage?.label,
        hasSubtitles: false,
      };
    }),
  );

  return (
    <section className="px-6 py-4">
      <h2 className="mb-3 text-lg font-semibold md:text-xl">{title}</h2>
      <div className="rail-scroll -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {cards.map((card) => (
          <div key={card.slug} className="w-[46vw] shrink-0 sm:w-[30vw] md:w-[22vw] lg:w-[16vw] xl:w-[14vw]">
            <VideoCard data={card} />
          </div>
        ))}
      </div>
    </section>
  );
}
