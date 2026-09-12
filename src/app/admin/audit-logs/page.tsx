import { prisma } from "@/lib/prisma";

export const metadata = { title: "Audit Logs" };

export default async function AuditLogsPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { displayName: true } } },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Audit Logs</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[var(--color-fg-muted)]">
            <tr>
              <th className="p-2">When</th>
              <th className="p-2">Actor</th>
              <th className="p-2">Action</th>
              <th className="p-2">Target</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-[var(--color-border)]">
                <td className="p-2 text-xs text-[var(--color-fg-muted)]">{log.createdAt.toLocaleString("en-MY")}</td>
                <td className="p-2">{log.actor?.displayName ?? "System"}</td>
                <td className="p-2 font-mono text-xs">{log.action}</td>
                <td className="p-2 text-xs text-[var(--color-fg-muted)]">
                  {log.targetType} {log.targetId?.slice(0, 8)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="p-4 text-sm text-[var(--color-fg-muted)]">No audit entries yet.</p>}
      </div>
    </div>
  );
}
