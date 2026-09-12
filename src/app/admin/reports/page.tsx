import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { reporter: { select: { displayName: true } }, content: { select: { title: true, slug: true } }, moderationCase: true },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Reports</h1>
      <ul className="space-y-2">
        {reports.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3 text-sm">
            <div>
              <p>
                <Link href={`/title/${r.content.slug}`} className="font-medium hover:text-[var(--color-accent)]">
                  {r.content.title}
                </Link>{" "}
                — {r.reason.replace("_", " ")}
              </p>
              <p className="text-xs text-[var(--color-fg-muted)]">by {r.reporter.displayName}</p>
            </div>
            <Badge tone={r.status === "OPEN" ? "gold" : "success"}>{r.status}</Badge>
          </li>
        ))}
        {reports.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No reports filed.</p>}
      </ul>
    </div>
  );
}
