import Link from "next/link";
import { clsx } from "clsx";
import { prisma } from "@/lib/prisma";
import type { ContentStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminDirectDecisionAction } from "./actions";

const STATUS_FILTERS: ContentStatus[] = ["UNDER_REVIEW", "PROCESSING", "PUBLISHED", "DRAFT", "RESTRICTED", "TAKEDOWN"];

export const metadata = { title: "Content" };

const STATUS_TONE: Record<string, "default" | "accent" | "gold" | "danger" | "success"> = {
  DRAFT: "default", UPLOADING: "gold", PROCESSING: "gold", READY: "accent", PUBLISHED: "success",
  SCHEDULED: "accent", UNDER_REVIEW: "gold", RESTRICTED: "danger", TAKEDOWN: "danger", ARCHIVED: "default",
};

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;

  const content = await prisma.content.findMany({
    where: { deletedAt: null, ...(status ? { status: status as ContentStatus } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { channel: { select: { name: true } } },
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Content</h1>
        <Link href="/admin/moderation" className="focus-ring interactive-dim rounded-full border border-[var(--color-accent)] px-3 py-1.5 text-sm text-[var(--color-accent)]">
          Review queue →
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5 text-sm">
        <Link
          href="/admin/content"
          className={clsx("focus-ring rounded-full border px-3 py-1", !status ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-[var(--color-border)] text-[var(--color-fg-muted)]")}
        >
          All
        </Link>
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={`/admin/content?status=${s}`}
            className={clsx("focus-ring rounded-full border px-3 py-1", status === s ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-[var(--color-border)] text-[var(--color-fg-muted)]")}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[var(--color-fg-muted)]">
            <tr>
              <th className="p-2">Title</th>
              <th className="p-2">Channel</th>
              <th className="p-2">Status</th>
              <th className="p-2">Visibility</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {content.map((c) => (
              <tr key={c.id} className="border-t border-[var(--color-border)]">
                <td className="p-2 font-medium">{c.title}</td>
                <td className="p-2 text-[var(--color-fg-muted)]">{c.channel.name}</td>
                <td className="p-2">
                  <Badge tone={STATUS_TONE[c.status]}>{c.status.replace("_", " ")}</Badge>
                </td>
                <td className="p-2 text-[var(--color-fg-muted)]">{c.visibility}</td>
                <td className="p-2">
                  <form action={adminDirectDecisionAction} className="flex gap-1">
                    <input type="hidden" name="contentId" value={c.id} />
                    {c.status === "UNDER_REVIEW" && (
                      <Button type="submit" name="decision" value="APPROVED" size="sm">
                        Approve
                      </Button>
                    )}
                    <Button type="submit" name="decision" value="RESTRICTED" size="sm" variant="secondary">
                      Restrict
                    </Button>
                    <Button type="submit" name="decision" value="TAKEDOWN" size="sm" variant="danger">
                      Takedown
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {content.length === 0 && <p className="p-4 text-sm text-[var(--color-fg-muted)]">No content found.</p>}
      </div>
    </div>
  );
}
