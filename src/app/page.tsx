import { Hero } from "@/components/hero";
import { Ticker } from "@/components/ticker";
import { ContentRail } from "@/components/rails/content-rail";
import { NewTodayRail } from "@/components/rails/new-today-rail";
import { EmptyCatalogue } from "@/components/empty-states";
import { getActiveTicker, getHeroContent, getHomepageSections, getNewTodayContent } from "@/modules/catalogue/service";
import { getSessionUser } from "@/lib/session";

export default async function HomePage() {
  const user = await getSessionUser();
  const [hero, sections, tickerEntries, newToday] = await Promise.all([
    getHeroContent(),
    getHomepageSections(user?.id),
    getActiveTicker(),
    getNewTodayContent(),
  ]);

  return (
    <div>
      <Ticker entries={tickerEntries} />
      {hero ? <Hero content={hero} /> : null}

      <div className="mx-auto max-w-[1600px] pb-16 pt-4">
        <NewTodayRail items={newToday} />
        {sections.length === 0 ? (
          <EmptyCatalogue />
        ) : (
          sections.map((section) => <ContentRail key={section.id} title={section.title} items={section.items} />)
        )}
      </div>
    </div>
  );
}
