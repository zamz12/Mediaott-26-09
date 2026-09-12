import { Hero } from "@/components/hero";
import { Ticker } from "@/components/ticker";
import { ContentRail } from "@/components/rails/content-rail";
import { EmptyCatalogue } from "@/components/empty-states";
import { getActiveTicker, getHeroContent, getHomepageSections } from "@/modules/catalogue/service";
import { getSessionUser } from "@/lib/session";

export default async function HomePage() {
  const user = await getSessionUser();
  const [hero, sections, tickerEntries] = await Promise.all([
    getHeroContent(),
    getHomepageSections(user?.id),
    getActiveTicker(),
  ]);

  return (
    <div>
      <Ticker entries={tickerEntries} />
      {hero ? <Hero content={hero} /> : null}

      <div className="mx-auto max-w-[1600px] pb-16 pt-4">
        {sections.length === 0 ? (
          <EmptyCatalogue />
        ) : (
          sections.map((section) => <ContentRail key={section.id} title={section.title} items={section.items} />)
        )}
      </div>
    </div>
  );
}
