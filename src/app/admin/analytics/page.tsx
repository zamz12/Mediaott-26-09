import { prisma } from "@/lib/prisma";

export const metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const eventCounts = await prisma.analyticsEvent.groupBy({
    by: ["eventType"],
    where: { occurredAt: { gte: since7d } },
    _count: { eventType: true },
    orderBy: { _count: { eventType: "desc" } },
  });

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-2xl font-bold">Platform analytics</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">Internal analytics event volume, last 7 days (Section 38).</p>
      <ul className="space-y-2">
        {eventCounts.map((row) => (
          <li key={row.eventType} className="flex justify-between rounded-lg border border-[var(--color-border)] p-3 text-sm">
            <span>{row.eventType.replace(/_/g, " ")}</span>
            <span className="text-[var(--color-fg-muted)]">{row._count.eventType}</span>
          </li>
        ))}
        {eventCounts.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No events recorded yet.</p>}
      </ul>
    </div>
  );
}
