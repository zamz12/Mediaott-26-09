import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Violations" };

const TONE: Record<string, "default" | "gold" | "danger"> = { WARNING: "default", MINOR: "gold", MAJOR: "danger", SEVERE: "danger" };

export default async function AdminViolationsPage() {
  const violations = await prisma.violation.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { displayName: true, email: true } } },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Violations</h1>
      <ul className="space-y-2">
        {violations.map((v) => (
          <li key={v.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3 text-sm">
            <div>
              <p className="font-medium">{v.user.displayName}</p>
              <p className="text-xs text-[var(--color-fg-muted)]">{v.reason}</p>
            </div>
            <Badge tone={TONE[v.severity]}>{v.severity}</Badge>
          </li>
        ))}
        {violations.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No violations recorded.</p>}
      </ul>
    </div>
  );
}
