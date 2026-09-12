import Link from "next/link";
import { requireSessionUser } from "@/lib/session";
import { getMyChannels } from "@/modules/media/service";
import { getCreatorDashboard } from "@/modules/analytics/service";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Creator Dashboard" };

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default async function CreatorDashboardPage() {
  const user = await requireSessionUser();
  const channels = await getMyChannels(user.id);

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[var(--color-border)] py-20 text-center">
        <h1 className="text-xl font-bold">Create your channel</h1>
        <p className="max-w-sm text-sm text-[var(--color-fg-muted)]">You need a channel before you can upload and publish content.</p>
        <Button href="/creator-studio/channel">Create channel</Button>
      </div>
    );
  }

  const dashboard = await getCreatorDashboard(channels.map((c) => c.id));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button href="/creator-studio/upload">Upload video</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Total views" value={dashboard.totalViews} />
        <Kpi label="Unique viewers" value={dashboard.uniqueViewers} />
        <Kpi label="Watch hours" value={dashboard.watchHours} />
        <Kpi label="Subscribers" value={dashboard.subscribers} />
        <Kpi label="Completion rate" value={`${dashboard.completionRatePct}%`} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Top videos</h2>
        {dashboard.topVideos.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)]">No views recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {dashboard.topVideos.map((v) => (
              <li key={v.contentId} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3 text-sm">
                <Link href={`/title/${v.slug}`} className="hover:text-[var(--color-accent)]">
                  {v.title}
                </Link>
                <span className="text-[var(--color-fg-muted)]">{v.views} views</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-8 text-xs text-[var(--color-fg-muted)]">
        Traffic sources, viewer geography, and device breakdowns arrive in Phase 2 alongside richer analytics collection.
      </p>
    </div>
  );
}
