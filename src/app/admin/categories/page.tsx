import { prisma } from "@/lib/prisma";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createCategoryAction, toggleCategoryActiveAction } from "./actions";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-2xl font-bold">Categories</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">Manage catalogue categories without a deployment (Section 9/25).</p>

      <form action={createCategoryAction} className="mb-6 flex gap-2">
        <Input name="label" placeholder="New category, e.g. Tourism" required />
        <Button type="submit">Add</Button>
      </form>

      <ul className="space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3">
            <span>{c.label}</span>
            <div className="flex items-center gap-2">
              <Badge tone={c.isActive ? "success" : "default"}>{c.isActive ? "Active" : "Hidden"}</Badge>
              <form action={toggleCategoryActiveAction}>
                <input type="hidden" name="id" value={c.id} />
                <Button type="submit" size="sm" variant="ghost">
                  {c.isActive ? "Hide" : "Show"}
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
