import Link from "next/link";
import { listCategories } from "@/modules/catalogue/service";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Categories</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.key}`}
            className="focus-ring interactive-glow flex h-24 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 text-center font-medium transition-transform duration-150 hover:-translate-y-0.5 hover:border-[var(--color-accent)]"
          >
            {category.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
