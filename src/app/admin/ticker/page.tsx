import { prisma } from "@/lib/prisma";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createTickerAction, deleteTickerAction, toggleTickerAction } from "./actions";

export const metadata = { title: "Ticker" };

export default async function AdminTickerPage() {
  const tickers = await prisma.ticker.findMany({ orderBy: { priority: "desc" }, include: { destinationContent: { select: { title: true } } } });

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-2xl font-bold">Announcement ticker</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">Configurable homepage ticker (Section 8).</p>

      <form action={createTickerAction} className="mb-6 space-y-2 rounded-xl border border-[var(--color-border)] p-4">
        <Input name="message" placeholder="e.g. LIVE: Melaka Cultural Festival — 8:30 PM" required />
        <Input name="slug" placeholder="Destination content slug (optional)" />
        <div className="grid grid-cols-3 gap-2">
          <Input name="priority" type="number" placeholder="Priority" defaultValue={0} />
          <Input name="startsAt" type="datetime-local" />
          <Input name="endsAt" type="datetime-local" />
        </div>
        <Button type="submit">Add announcement</Button>
      </form>

      <ul className="space-y-2">
        {tickers.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] p-3 text-sm">
            <div className="min-w-0">
              <p className="truncate">{t.message}</p>
              {t.destinationContent && <p className="text-xs text-[var(--color-fg-muted)]">→ {t.destinationContent.title}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={t.isEnabled ? "success" : "default"}>{t.isEnabled ? "Enabled" : "Disabled"}</Badge>
              <form action={toggleTickerAction}>
                <input type="hidden" name="id" value={t.id} />
                <Button type="submit" size="sm" variant="ghost">
                  {t.isEnabled ? "Disable" : "Enable"}
                </Button>
              </form>
              <form action={deleteTickerAction}>
                <input type="hidden" name="id" value={t.id} />
                <Button type="submit" size="sm" variant="ghost">
                  Delete
                </Button>
              </form>
            </div>
          </li>
        ))}
        {tickers.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No announcements yet.</p>}
      </ul>
    </div>
  );
}
