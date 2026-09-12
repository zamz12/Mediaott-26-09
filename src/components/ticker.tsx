import Link from "next/link";
import { Radio } from "lucide-react";

interface TickerEntry {
  id: string;
  message: string;
  destinationContent: { slug: string; title: string } | null;
}

// Configurable announcement ticker (Section 8). Non-intrusive: a single
// thin bar, pausable via prefers-reduced-motion, never audio/autoplay.
export function Ticker({ entries }: { entries: TickerEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 overflow-hidden px-6 py-2 text-sm">
        <Radio size={14} className="shrink-0 text-[var(--color-gold)]" />
        <div className="flex gap-8 overflow-x-auto whitespace-nowrap">
          {entries.map((entry) =>
            entry.destinationContent ? (
              <Link key={entry.id} href={`/watch/${entry.destinationContent.slug}`} className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">
                {entry.message}
              </Link>
            ) : (
              <span key={entry.id} className="text-[var(--color-fg-muted)]">
                {entry.message}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
