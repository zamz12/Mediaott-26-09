import { requireSessionUser } from "@/lib/session";
import { getMyChannels, listMyContent } from "@/modules/media/service";
import { prisma } from "@/lib/prisma";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addToPlaylistAction, createChannelPlaylistAction } from "./actions";

export const metadata = { title: "Playlists" };

export default async function CreatorPlaylistsPage() {
  const user = await requireSessionUser();
  const channels = await getMyChannels(user.id);
  const channelIds = channels.map((c) => c.id);

  const [playlists, content] = await Promise.all([
    prisma.playlist.findMany({ where: { channelId: { in: channelIds } }, include: { items: { include: { content: { select: { title: true } } } } } }),
    listMyContent(channelIds),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Playlists</h1>

      <form action={createChannelPlaylistAction} className="flex gap-2">
        <Input name="name" placeholder="New playlist name" required />
        <Button type="submit">Create</Button>
      </form>

      {playlists.map((p) => (
        <div key={p.id} className="rounded-xl border border-[var(--color-border)] p-4">
          <h2 className="mb-2 font-semibold">{p.name}</h2>
          <ul className="mb-3 space-y-1 text-sm text-[var(--color-fg-muted)]">
            {p.items.map((i) => (
              <li key={i.id}>{i.content.title}</li>
            ))}
            {p.items.length === 0 && <li>No videos yet.</li>}
          </ul>
          {content.length > 0 && (
            <form action={addToPlaylistAction} className="flex gap-2">
              <input type="hidden" name="playlistId" value={p.id} />
              <select name="contentId" className="focus-ring h-9 flex-1 rounded-lg border border-[var(--color-border)] bg-transparent px-2 text-sm">
                {content.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="secondary">
                Add
              </Button>
            </form>
          )}
        </div>
      ))}
      {playlists.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No playlists yet.</p>}
    </div>
  );
}
