import Link from "next/link";
import { Shield } from "lucide-react";
import { requireSessionUser } from "@/lib/session";
import { listConversations, getDefaultAdminContact } from "@/modules/messaging/service";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Messages" };

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function MessagesPage() {
  const user = await requireSessionUser();
  const [conversations, admin] = await Promise.all([listConversations(user.id), getDefaultAdminContact()]);

  const hasAdminConversation = admin && conversations.some((c) => c.otherParty.id === admin.id);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Messages</h1>

      <div className="space-y-2">
        {admin && !hasAdminConversation && (
          <Link
            href={`/messages/${admin.id}`}
            className="focus-ring interactive-dim flex items-center gap-3 rounded-xl border border-[var(--color-accent)] p-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
              <Shield size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">Contact Admin / Support</p>
              <p className="truncate text-xs text-[var(--color-fg-muted)]">Always available for help, reports, or questions</p>
            </div>
          </Link>
        )}

        {conversations.map(({ otherParty, lastMessage, unreadCount }) => (
          <Link
            key={otherParty.id}
            href={`/messages/${otherParty.id}`}
            className="focus-ring interactive-dim flex items-center gap-3 rounded-xl border border-[var(--color-border)] p-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
              {otherParty.displayName.slice(0, 1).toUpperCase()}
              {otherParty.id === admin?.id && (
                <span className="absolute -mt-6 ml-6 text-[var(--color-accent)]">
                  <Shield size={11} />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {otherParty.displayName}
                {otherParty.id === admin?.id && <span className="ml-1.5 text-xs text-[var(--color-accent)]">Admin</span>}
              </p>
              <p className="truncate text-xs text-[var(--color-fg-muted)]">{lastMessage.body}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-xs text-[var(--color-fg-muted)]">{timeAgo(lastMessage.createdAt)}</span>
              {unreadCount > 0 && <Badge tone="accent">{unreadCount}</Badge>}
            </div>
          </Link>
        ))}

        {conversations.length === 0 && !admin && <p className="text-sm text-[var(--color-fg-muted)]">No conversations yet.</p>}
      </div>
    </div>
  );
}
