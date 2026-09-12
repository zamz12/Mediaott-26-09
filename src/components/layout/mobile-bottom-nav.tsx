"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Search, Bookmark, User } from "lucide-react";
import { clsx } from "clsx";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/search", label: "Search", icon: Search },
  { href: "/my-list", label: "My List", icon: Bookmark },
  { href: "/account", label: "Profile", icon: User },
];

// First-class mobile nav (Section 4/48) — not a shrunken desktop menu.
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)] pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "focus-ring flex flex-1 flex-col items-center justify-center gap-1 text-[11px]",
              active ? "text-[var(--color-accent)]" : "text-[var(--color-fg-muted)]",
            )}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
