import { prisma } from "@/lib/prisma";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createGenreAction, toggleGenreActiveAction } from "./actions";

export const metadata = { title: "Genres" };

export default async function AdminGenresPage() {
  const genres = await prisma.genre.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-2xl font-bold">Genres &amp; themes</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">Manage genres without a deployment (Section 9/25).</p>

      <form action={createGenreAction} className="mb-6 flex gap-2">
        <Input name="label" placeholder="New genre, e.g. Culture" required />
        <Button type="submit">Add</Button>
      </form>

      <ul className="flex flex-wrap gap-2">
        {genres.map((g) => (
          <li key={g.id} className="flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm">
            {g.label}
            <Badge tone={g.isActive ? "success" : "default"}>{g.isActive ? "Active" : "Hidden"}</Badge>
            <form action={toggleGenreActiveAction}>
              <input type="hidden" name="id" value={g.id} />
              <button type="submit" className="focus-ring text-xs text-[var(--color-accent)]">
                {g.isActive ? "Hide" : "Show"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
