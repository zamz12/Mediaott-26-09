import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { listNotifications } from "@/modules/notifications/service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";
import { markAllNotificationsReadAction, markNotificationReadAction } from "./actions";

export const metadata = { title: "Notifications" };

const EVENT_TONE: Record<string, "default" | "accent" | "gold" | "danger" | "success"> = {
  CONTENT_APPROVED: "success",
  CONTENT_SUBMITTED: "accent",
  CONTENT_FLAGGED: "gold",
  CONTENT_RESTRICTED: "gold",
  CONTENT_TAKEDOWN: "danger",
  CONTENT_REJECTED: "danger",
  VIOLATION_ISSUED: "danger",
  CREATOR_FOLLOWED: "accent",
  NEW_MESSAGE: "accent",
  MODERATION_NOTICE: "gold",
  ACCOUNT_NOTICE: "default",
  NEW_EPISODE: "accent",
  CHANNEL_UPLOAD: "accent",
  LIVE_STARTING: "danger",
};

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/notifications");

  const notifications = await listNotifications(user.id);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {notifications.some((n) => !n.isRead) && (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="ghost" size="sm">
              Mark all read
            </Button>
          </form>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((n) => (
          <div key={n.id} className={clsx("rounded-xl border border-[var(--color-border)] p-3", !n.isRead && "bg-[var(--color-accent)]/5")}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone={EVENT_TONE[n.eventType] ?? "default"}>{n.eventType.replace(/_/g, " ")}</Badge>
                  <span className="text-xs text-[var(--color-fg-muted)]">{timeAgo(n.createdAt)}</span>
                </div>
                <p className={clsx("mt-1 text-sm", !n.isRead && "font-medium")}>{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-[var(--color-fg-muted)]">{n.body}</p>}
              </div>
              {!n.isRead && (
                <form action={markNotificationReadAction.bind(null, n.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    Mark read
                  </Button>
                </form>
              )}
            </div>
            {n.linkUrl && (
              <Link href={n.linkUrl} className="mt-2 inline-block text-sm text-[var(--color-accent)] hover:underline">
                View →
              </Link>
            )}
          </div>
        ))}

        {notifications.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No notifications yet.</p>}
      </div>
    </div>
  );
}
