import { notFound } from "next/navigation";
import { getSectionWithItems, type HomepageSectionFilter } from "@/modules/admin/homepage";
import { listCategories, listGenres } from "@/modules/catalogue/service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addManualItemAction, removeManualItemAction, updateSectionFilterAction } from "../actions";

const ALGORITHMS = ["MANUAL", "TRENDING", "NEWEST", "CONTINUE_WATCHING", "RECOMMENDED", "BY_CATEGORY", "BY_GENRE", "FOLLOWED_CHANNELS", "LIVE_NOW"];

export default async function HomepageSectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const section = await getSectionWithItems(id);
  if (!section) notFound();

  const [categories, genres] = await Promise.all([listCategories(), listGenres()]);
  const filter = (section.filterJson as HomepageSectionFilter | null) ?? {};

  const boundUpdateFilter = updateSectionFilterAction.bind(null, section.id);
  const boundAddItem = addManualItemAction.bind(null, section.id);
  const boundRemoveItem = removeManualItemAction.bind(null, section.id);

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">{section.title}</h1>

      <form action={boundUpdateFilter} className="mb-8 space-y-3 rounded-xl border border-[var(--color-border)] p-4">
        <div>
          <label className="mb-1 block text-sm text-[var(--color-fg-muted)]">Algorithm</label>
          <select name="algorithm" defaultValue={section.algorithm} className="focus-ring h-11 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm">
            {ALGORITHMS.map((a) => (
              <option key={a} value={a}>
                {a.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-[var(--color-fg-muted)]">Category filter</label>
            <select name="categoryKey" defaultValue={filter.categoryKey ?? ""} className="focus-ring h-11 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm">
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--color-fg-muted)]">Genre filter</label>
            <select name="genreKey" defaultValue={filter.genreKey ?? ""} className="focus-ring h-11 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm">
              <option value="">—</option>
              {genres.map((g) => (
                <option key={g.id} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button type="submit" size="sm">
          Save
        </Button>
      </form>

      {section.algorithm === "MANUAL" && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Manually selected items</h2>
          <form action={boundAddItem} className="mb-4 flex gap-2">
            <Input name="slug" placeholder="Content slug to add" required />
            <Button type="submit">Add</Button>
          </form>
          <ul className="space-y-2">
            {section.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3 text-sm">
                {item.content.title}
                <form action={boundRemoveItem}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
            {section.items.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No items yet.</p>}
          </ul>
        </div>
      )}
    </div>
  );
}
