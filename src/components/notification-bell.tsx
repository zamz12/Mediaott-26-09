"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { clsx } from "clsx";
import { getNotificationSummaryAction, markAllNotificationsReadAction, markNotificationReadAction } from "@/app/notifications/actions";

const POLL_INTERVAL_MS = 30000;

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: Date;
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Polls rather than a live socket — consistent with the rest of the app's
// "server action + interval" pattern (see AutoRefreshWhileProcessing) and
// cheap enough at 30s that it never needs a dedicated realtime layer.
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState<NotificationItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    try {
      const summary = await getNotificationSummaryAction();
      setUnreadCount(summary.unreadCount);
      setRecent(summary.recent);
    } catch {
      // signed-out or transient error — bell just shows stale/zero state
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="focus-ring relative rounded-full p-2 hover:bg-white/5"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="pulse-dot absolute right-1 top-1 flex h-2 w-2 rounded-full bg-[var(--color-danger)]" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2 shadow-xl">
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs text-[var(--color-accent)] hover:underline"
                onClick={async () => {
                  await markAllNotificationsReadAction();
                  refresh();
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 space-y-0.5 overflow-y-auto">
            {recent.map((n) => (
              <Link
                key={n.id}
                href={n.linkUrl ?? "/notifications"}
                onClick={async () => {
                  setOpen(false);
                  if (!n.isRead) await markNotificationReadAction(n.id);
                }}
                className={clsx("focus-ring block rounded-lg px-2 py-2 text-sm hover:bg-white/5", !n.isRead && "bg-[var(--color-accent)]/5")}
              >
                <p className="flex items-start gap-1.5">
                  {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />}
                  <span className={clsx(!n.isRead && "font-medium")}>{n.title}</span>
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">{timeAgo(n.createdAt)}</p>
              </Link>
            ))}
            {recent.length === 0 && <p className="px-2 py-4 text-center text-sm text-[var(--color-fg-muted)]">No notifications yet.</p>}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="focus-ring mt-1 block rounded-lg px-2 py-1.5 text-center text-xs text-[var(--color-accent)] hover:bg-white/5"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
