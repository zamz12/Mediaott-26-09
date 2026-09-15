"use client";

import { Check } from "lucide-react";
import { clsx } from "clsx";
import { useAppearance, type Palette, type UiScale } from "@/components/appearance-provider";

const PALETTES: { key: Palette; label: string; swatch: string }[] = [
  { key: "cyan", label: "Cyan", swatch: "#22d3ee" },
  { key: "violet", label: "Violet", swatch: "#a78bfa" },
  { key: "rose", label: "Rose", swatch: "#fb7185" },
  { key: "emerald", label: "Emerald", swatch: "#34d399" },
  { key: "amber", label: "Amber", swatch: "#fbbf24" },
];

const SCALES: { key: UiScale; label: string; description: string }[] = [
  { key: "COMPACT", label: "Compact", description: "Smaller icons, text & video player" },
  { key: "COMFORTABLE", label: "Comfortable", description: "Default sizing" },
  { key: "LARGE", label: "Large", description: "Bigger icons, text & video player" },
];

export function AppearanceSettings() {
  const { palette, uiScale, setPalette, setUiScale } = useAppearance();

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">Accent color</h2>
        <div className="flex flex-wrap gap-3">
          {PALETTES.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPalette(p.key)}
              aria-label={p.label}
              aria-pressed={palette === p.key}
              className="interactive-dim flex flex-col items-center gap-1.5"
            >
              <span
                className={clsx(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  palette === p.key ? "border-[var(--color-fg)]" : "border-transparent",
                )}
                style={{ backgroundColor: p.swatch }}
              >
                {palette === p.key && <Check size={16} className="text-black" />}
              </span>
              <span className="text-xs text-[var(--color-fg-muted)]">{p.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">Interface size</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {SCALES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setUiScale(s.key)}
              aria-pressed={uiScale === s.key}
              className={clsx(
                "interactive-dim rounded-xl border p-3 text-left",
                uiScale === s.key ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10" : "border-[var(--color-border)]",
              )}
            >
              <p className="text-sm font-medium">{s.label}</p>
              <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">{s.description}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
