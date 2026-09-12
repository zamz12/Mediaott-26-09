import { notFound } from "next/navigation";
import { ContentRail } from "@/components/rails/content-rail";
import { EmptyCatalogue } from "@/components/empty-states";
import { listByCategory, listCategories } from "@/modules/catalogue/service";

export default async function CategoryPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const categories = await listCategories();
  const category = categories.find((c) => c.key === key);
  if (!category) notFound();

  const items = await listByCategory(key);

  return (
    <div className="mx-auto max-w-[1600px] py-8">
      <h1 className="px-6 text-2xl font-bold">{category.label}</h1>
      {items.length === 0 ? <EmptyCatalogue /> : <ContentRail title="" items={items} />}
    </div>
  );
}
