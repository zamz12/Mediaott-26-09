import { getAdminDashboard } from "@/modules/admin/dashboard";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Admin Dashboard" };

function formatBytes(bytes: bigint | number) {
  const n = Number(bytes);
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let value = n;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const d = await getAdminDashboard();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Badge tone="success">System: {d.systemHealth}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Kpi label="Registered users" value={d.registeredUsers} />
        <Kpi label="Active users (30d)" value={d.activeUsers} />
        <Kpi label="Creators" value={d.creators} />
        <Kpi label="Channels" value={d.channels} />
        <Kpi label="Videos" value={d.videos} />
        <Kpi label="Total viewing hours" value={d.totalViewingHours} />
        <Kpi label="Live viewers" value={d.liveViewers} />
        <Kpi label="Storage consumed" value={formatBytes(d.storageConsumedBytes)} />
        <Kpi label="Uploads today" value={d.uploadsToday} />
        <Kpi label="Moderation backlog" value={d.moderationBacklog} />
        <Kpi label="Reported content" value={d.reportedContent} />
      </div>
    </div>
  );
}
