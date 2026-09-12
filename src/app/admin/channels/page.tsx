import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toggleChannelVerifiedAction } from "./actions";

export const metadata = { title: "Channels" };

export default async function AdminChannelsPage() {
  const channels = await prisma.channel.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { ownerUser: { select: { displayName: true } }, organisation: { select: { name: true } }, _count: { select: { content: true, subscriptions: true } } },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Channels</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[var(--color-fg-muted)]">
            <tr>
              <th className="p-2">Channel</th>
              <th className="p-2">Owner</th>
              <th className="p-2">Content</th>
              <th className="p-2">Subscribers</th>
              <th className="p-2">Verified</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {channels.map((c) => (
              <tr key={c.id} className="border-t border-[var(--color-border)]">
                <td className="p-2 font-medium">{c.name}</td>
                <td className="p-2 text-[var(--color-fg-muted)]">{c.ownerUser?.displayName ?? c.organisation?.name ?? "—"}</td>
                <td className="p-2">{c._count.content}</td>
                <td className="p-2">{c._count.subscriptions}</td>
                <td className="p-2">
                  <Badge tone={c.isVerified ? "accent" : "default"}>{c.isVerified ? "Verified" : "Unverified"}</Badge>
                </td>
                <td className="p-2">
                  <form action={toggleChannelVerifiedAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      {c.isVerified ? "Remove" : "Verify"}
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
