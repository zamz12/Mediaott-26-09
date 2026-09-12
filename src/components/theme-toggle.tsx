"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";

const OPTIONS = [
  { value: "SYSTEM", icon: Monitor, label: "Match system" },
  { value: "DARK", icon: Moon, label: "Dark" },
  { value: "LIGHT", icon: Sun, label: "Light" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center rounded-full border border-[var(--color-border)] p-0.5">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className={`focus-ring flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            theme === value ? "bg-[var(--color-accent)] text-black" : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          }`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
