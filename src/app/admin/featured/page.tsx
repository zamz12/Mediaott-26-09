import { prisma } from "@/lib/prisma";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setFeaturedHeroAction } from "./actions";

export const metadata = { title: "Featured Content" };

export default async function AdminFeaturedPage() {
  const hero = await prisma.homepageSection.findUnique({
    where: { key: "hero" },
    include: { items: { include: { content: { select: { title: true, slug: true } } } } },
  });

  return (
    <div className="max-w-lg">
      <h1 className="mb-2 text-2xl font-bold">Featured content</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">Controls the large hero banner on the homepage (Section 6).</p>

      <div className="mb-6 rounded-lg border border-[var(--color-border)] p-4">
        <p className="text-sm text-[var(--color-fg-muted)]">Current hero</p>
        <p className="text-lg font-medium">{hero?.items[0]?.content.title ?? "None set — falls back to newest published content"}</p>
      </div>

      <form action={setFeaturedHeroAction} className="flex gap-2">
        <Input name="slug" placeholder="Content slug to feature" required />
        <Button type="submit">Set as hero</Button>
      </form>
    </div>
  );
}
