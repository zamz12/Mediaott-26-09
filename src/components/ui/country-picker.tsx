"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { COUNTRIES, countryName } from "@/lib/countries";

// Native <details> gives the "collapsible menu" the free keyboard/focus
// handling + click-outside-to-close a hand-rolled dropdown would need to
// reimplement, while still letting us put a search box and button list
// inside instead of a plain OS <select> popup.
export function CountryPicker({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [query, setQuery] = useState("");
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const filtered = COUNTRIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.code.toLowerCase().includes(query.toLowerCase()));

  function select(code: string) {
    setValue(code);
    setQuery("");
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details ref={detailsRef} className="group relative w-full max-w-xs">
      <input type="hidden" name={name} value={value} />
      <summary
        className={clsx(
          "focus-ring flex h-11 w-full cursor-pointer list-none items-center justify-between rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <span className={value ? "" : "text-[var(--color-fg-muted)]"}>{value ? countryName(value) : "Select country…"}</span>
        <ChevronDown size={16} className="shrink-0 text-[var(--color-fg-muted)] transition-transform group-open:rotate-180" />
      </summary>

      <div className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2 shadow-xl">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search countries…"
          className="focus-ring mb-1.5 h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-2 text-sm"
          autoFocus
        />
        <div className="max-h-56 overflow-y-auto">
          {value && (
            <button
              type="button"
              onClick={() => select("")}
              className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-[var(--color-fg-muted)] hover:bg-white/5"
            >
              Clear selection
            </button>
          )}
          {filtered.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => select(c.code)}
              className={clsx("block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/5", value === c.code && "text-[var(--color-accent)]")}
            >
              {c.name} <span className="text-[var(--color-fg-muted)]">({c.code})</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="px-2 py-2 text-sm text-[var(--color-fg-muted)]">No matches.</p>}
        </div>
      </div>
    </details>
  );
}
