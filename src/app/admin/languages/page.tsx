import { prisma } from "@/lib/prisma";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createLanguageAction, toggleUiLanguageAction } from "./actions";

export const metadata = { title: "Languages" };

export default async function AdminLanguagesPage() {
  const languages = await prisma.language.findMany({ orderBy: { label: "asc" } });

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-2xl font-bold">Languages</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">
        Add languages with proper locale codes (e.g. ms-MY, en-MY, zh-MY, ta-MY, ko-KR). UI languages are shown in the interface language switcher.
      </p>

      <form action={createLanguageAction} className="mb-6 flex flex-wrap gap-2">
        <Input name="code" placeholder="Locale code, e.g. ko-KR" className="w-40" required />
        <Input name="label" placeholder="Label, e.g. Korean" className="flex-1" required />
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" name="isUiLanguage" /> UI language
        </label>
        <Button type="submit">Add</Button>
      </form>

      <ul className="space-y-2">
        {languages.map((l) => (
          <li key={l.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3 text-sm">
            <span>
              {l.label} <span className="text-[var(--color-fg-muted)]">({l.code})</span>
            </span>
            <div className="flex items-center gap-2">
              {l.isUiLanguage && <Badge tone="accent">UI language</Badge>}
              <form action={toggleUiLanguageAction}>
                <input type="hidden" name="id" value={l.id} />
                <Button type="submit" size="sm" variant="ghost">
                  {l.isUiLanguage ? "Remove from UI" : "Make UI language"}
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
