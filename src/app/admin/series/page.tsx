import { prisma } from "@/lib/prisma";

export const metadata = { title: "Series" };

export default async function AdminSeriesPage() {
  const series = await prisma.series.findMany({
    where: { deletedAt: null },
    include: { channel: { select: { name: true } }, seasons: { include: { episodes: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Series</h1>
      <ul className="space-y-2">
        {series.map((s) => (
          <li key={s.id} className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
            <p className="font-medium">{s.title}</p>
            <p className="text-xs text-[var(--color-fg-muted)]">
              {s.channel.name} · {s.seasons.length} season(s) · {s.seasons.reduce((n, se) => n + se.episodes.length, 0)} episode(s)
            </p>
          </li>
        ))}
        {series.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No series yet.</p>}
      </ul>
    </div>
  );
}
