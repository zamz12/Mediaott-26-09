import { notFound } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listThread, markThreadRead } from "@/modules/messaging/service";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";
import { sendMessageAction } from "../actions";

export const metadata = { title: "Conversation" };

export default async function ThreadPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: otherUserId } = await params;
  const user = await requireSessionUser();

  const otherParty = await prisma.user.findUnique({ where: { id: otherUserId }, select: { displayName: true, handle: true } });
  if (!otherParty) notFound();

  const messages = await listThread(user.id, otherUserId);
  await markThreadRead(user.id, otherUserId);

  const boundSend = sendMessageAction.bind(null, otherUserId);

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col px-6 py-6">
      <div className="mb-4 border-b border-[var(--color-border)] pb-3">
        <h1 className="text-lg font-bold">{otherParty.displayName}</h1>
        <p className="text-xs text-[var(--color-fg-muted)]">@{otherParty.handle}</p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={clsx(
              "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
              m.senderId === user.id ? "ml-auto bg-[var(--color-accent)] text-black" : "bg-[var(--color-bg-elevated)]",
            )}
          >
            {m.body}
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">Say hello 👋</p>}
      </div>

      <form action={boundSend} className="mt-4 flex items-end gap-2 border-t border-[var(--color-border)] pt-4">
        <Textarea name="body" rows={1} placeholder="Write a message…" required className="flex-1" />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
}
