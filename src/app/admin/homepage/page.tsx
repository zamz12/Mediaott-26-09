import Link from "next/link";
import { ArrowUp, ArrowDown } from "lucide-react";
import { listHomepageSections } from "@/modules/admin/homepage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSectionAction, deleteSectionAction, moveSectionAction, toggleSectionAction } from "./actions";

export const metadata = { title: "Homepage" };

const ALGORITHMS = ["MANUAL", "TRENDING", "NEWEST", "CONTINUE_WATCHING", "RECOMMENDED", "BY_CATEGORY", "BY_GENRE", "FOLLOWED_CHANNELS", "LIVE_NOW"];

export default async function AdminHomepagePage() {
  const sections = await listHomepageSections();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">Homepage rows</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">Reorder, hide, or retarget homepage sections — changes apply instantly, no deployment (Section 25).</p>

      <form action={createSectionAction} className="mb-6 flex flex-wrap gap-2">
        <Input name="title" placeholder="Row title, e.g. Malaysian Stories" className="flex-1" required />
        <select name="algorithm" className="focus-ring h-11 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm">
          {ALGORITHMS.map((a) => (
            <option key={a} value={a}>
              {a.replace("_", " ")}
            </option>
          ))}
        </select>
        <Button type="submit">Add row</Button>
      </form>

      <ul className="space-y-2">
        {sections.map((s, i) => (
          <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] p-3">
            <div className="flex flex-col">
              <form action={moveSectionAction}>
                <input type="hidden" name="sectionId" value={s.id} />
                <button type="submit" name="direction" value="UP" disabled={i === 0} className="focus-ring text-[var(--color-fg-muted)] disabled:opacity-30">
                  <ArrowUp size={14} />
                </button>
              </form>
              <form action={moveSectionAction}>
                <input type="hidden" name="sectionId" value={s.id} />
                <button type="submit" name="direction" value="DOWN" disabled={i === sections.length - 1} className="focus-ring text-[var(--color-fg-muted)] disabled:opacity-30">
                  <ArrowDown size={14} />
                </button>
              </form>
            </div>

            <div className="min-w-0 flex-1">
              <Link href={`/admin/homepage/${s.id}`} className="font-medium hover:text-[var(--color-accent)]">
                {s.title}
              </Link>
              <p className="text-xs text-[var(--color-fg-muted)]">
                {s.algorithm.replace("_", " ")} {s.algorithm === "MANUAL" && `· ${s._count.items} items`}
              </p>
            </div>

            <Badge tone={s.isVisible ? "success" : "default"}>{s.isVisible ? "Visible" : "Hidden"}</Badge>

            <form action={toggleSectionAction}>
              <input type="hidden" name="sectionId" value={s.id} />
              <Button type="submit" size="sm" variant="ghost">
                {s.isVisible ? "Hide" : "Show"}
              </Button>
            </form>
            <form action={deleteSectionAction}>
              <input type="hidden" name="sectionId" value={s.id} />
              <Button type="submit" size="sm" variant="ghost">
                Delete
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
