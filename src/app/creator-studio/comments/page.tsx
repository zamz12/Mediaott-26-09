import { requireSessionUser } from "@/lib/session";
import { getMyChannels } from "@/modules/media/service";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { hideCommentAction } from "./actions";

export const metadata = { title: "Comments" };

export default async function CreatorCommentsPage() {
  const user = await requireSessionUser();
  const channelIds = (await getMyChannels(user.id)).map((c) => c.id);

  const comments = await prisma.comment.findMany({
    where: { content: { channelId: { in: channelIds } }, isHidden: false, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { displayName: true } }, content: { select: { title: true, slug: true } } },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Comments</h1>
      <ul className="space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
            <p className="mb-1 text-[var(--color-fg-muted)]">
              {c.user.displayName} on <span className="text-[var(--color-fg)]">{c.content.title}</span>
            </p>
            <p className="mb-2">{c.body}</p>
            <form action={hideCommentAction}>
              <input type="hidden" name="commentId" value={c.id} />
              <Button type="submit" size="sm" variant="ghost">
                Hide
              </Button>
            </form>
          </li>
        ))}
        {comments.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No comments yet.</p>}
      </ul>
    </div>
  );
}
