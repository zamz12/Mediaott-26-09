import { Clapperboard, SearchX, Bookmark, VideoOff, UploadCloud, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <div className="rounded-full bg-white/5 p-4 text-[var(--color-fg-muted)]">{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-[var(--color-fg-muted)]">{description}</p>
      {action}
    </div>
  );
}

export function EmptyCatalogue() {
  return (
    <EmptyState
      icon={<Clapperboard size={28} />}
      title="Nothing published yet"
      description="New Malaysian stories are on the way. Check back soon, or explore what creators are working on."
    />
  );
}

export function NoSearchResults({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<SearchX size={28} />}
      title={`No results for "${query}"`}
      description="Try a different title, creator, or genre — or check your spelling."
    />
  );
}

export function EmptyWatchlist() {
  return (
    <EmptyState
      icon={<Bookmark size={28} />}
      title="Your list is empty"
      description="Tap + My List on anything you want to watch later — it'll show up here."
      action={<Button href="/explore">Explore content</Button>}
    />
  );
}

export function VideoUnavailable() {
  return (
    <EmptyState
      icon={<VideoOff size={28} />}
      title="This video isn't available"
      description="It may have been removed, restricted, or is still being processed. Please try again later."
    />
  );
}

export function EmptyCreatorLibrary() {
  return (
    <EmptyState
      icon={<UploadCloud size={28} />}
      title="No content yet"
      description="Upload your first video to start building your channel."
    />
  );
}

export function ModerationRestricted({ reason }: { reason?: string }) {
  return (
    <EmptyState
      icon={<ShieldAlert size={28} />}
      title="This content is restricted"
      description={reason ?? "This video was restricted following a moderation review."}
    />
  );
}
