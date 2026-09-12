import { requireSessionUser } from "@/lib/session";
import { getMyChannels, listChannelSeriesFull, listUnassignedContent } from "@/modules/media/service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createSeasonAction, createSeriesAction, attachEpisodeAction } from "./actions";

export const metadata = { title: "Series" };

export default async function SeriesPage() {
  const user = await requireSessionUser();
  const channels = await getMyChannels(user.id);
  const channelIds = channels.map((c) => c.id);
  const [series, unassigned] = await Promise.all([listChannelSeriesFull(channelIds), listUnassignedContent(channelIds)]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="mb-4 text-2xl font-bold">Series</h1>
        <form action={createSeriesAction} className="flex gap-2">
          <Input name="title" placeholder="New series title" required />
          <Button type="submit">Create</Button>
        </form>
      </div>

      {series.map((s) => (
        <div key={s.id} className="rounded-xl border border-[var(--color-border)] p-4">
          <h2 className="mb-3 font-semibold">{s.title}</h2>

          {s.seasons.map((season) => (
            <div key={season.id} className="mb-3 rounded-lg bg-white/5 p-3">
              <p className="mb-2 text-sm font-medium">Season {season.seasonNumber}{season.title ? ` — ${season.title}` : ""}</p>
              <ul className="mb-2 space-y-1 text-sm text-[var(--color-fg-muted)]">
                {season.episodes.map((ep) => (
                  <li key={ep.id}>
                    Ep {ep.episodeNumber}: {ep.content.title} ({ep.content.status})
                  </li>
                ))}
                {season.episodes.length === 0 && <li>No episodes yet.</li>}
              </ul>
              {unassigned.length > 0 && (
                <form action={attachEpisodeAction} className="flex flex-wrap items-center gap-2 text-sm">
                  <input type="hidden" name="seasonId" value={season.id} />
                  <select name="contentId" className="focus-ring h-9 rounded-lg border border-[var(--color-border)] bg-transparent px-2 text-sm" required>
                    {unassigned.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <input type="number" name="episodeNumber" min={1} placeholder="Ep #" className="focus-ring h-9 w-20 rounded-lg border border-[var(--color-border)] bg-transparent px-2 text-sm" required />
                  <Button type="submit" size="sm" variant="secondary">
                    Add episode
                  </Button>
                </form>
              )}
            </div>
          ))}

          <form action={createSeasonAction} className="flex items-center gap-2">
            <input type="hidden" name="seriesId" value={s.id} />
            <input type="number" name="seasonNumber" min={1} placeholder="Season #" className="focus-ring h-9 w-24 rounded-lg border border-[var(--color-border)] bg-transparent px-2 text-sm" required />
            <Input name="title" placeholder="Season title (optional)" className="h-9 flex-1" />
            <Button type="submit" size="sm" variant="ghost">
              Add season
            </Button>
          </form>
        </div>
      ))}

      {series.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No series yet. Create one above.</p>}
    </div>
  );
}
