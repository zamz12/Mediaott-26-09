import Link from "next/link";
import { Search, Clapperboard } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/rbac";
import type { Branding } from "@/modules/admin/branding";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/live", label: "Live" },
  { href: "/categories", label: "Categories" },
  { href: "/channels", label: "Channels" },
  { href: "/my-list", label: "My List" },
];

export function SiteHeader({ user, branding }: { user: SessionUser | null; branding: Branding }) {
  const isCreator = user?.roles.includes("CREATOR");
  const isAdmin = user?.roles.includes("ADMIN");

  return (
    <header className="sticky top-0 z-40 hidden border-b border-[var(--color-border)] bg-[var(--color-bg-overlay)] backdrop-blur md:block">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Clapperboard className="text-[var(--color-accent)]" size={22} />
          {branding.name}
        </Link>

        <nav className="flex flex-1 items-center gap-1 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="focus-ring rounded-full px-3 py-2 text-[var(--color-fg-muted)] transition-colors hover:bg-white/5 hover:text-[var(--color-fg)]"
            >
              {link.label}
            </Link>
          ))}
          {isCreator && (
            <Link
              href="/creator-studio"
              className="focus-ring rounded-full px-3 py-2 text-[var(--color-gold)] transition-colors hover:bg-white/5"
            >
              Creator Studio
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className="focus-ring rounded-full px-3 py-2 text-[var(--color-fg-muted)] transition-colors hover:bg-white/5 hover:text-[var(--color-fg)]"
            >
              Admin
            </Link>
          )}
        </nav>

        <Link href="/search" aria-label="Search" className="focus-ring rounded-full p-2 hover:bg-white/5">
          <Search size={18} />
        </Link>
        <ThemeToggle />
        {user ? (
          <Link href="/account" className="focus-ring flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
            {user.displayName.slice(0, 1).toUpperCase()}
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Button href="/login" variant="ghost" size="sm">
              Log in
            </Button>
            <Button href="/register" variant="primary" size="sm">
              Sign up free
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
