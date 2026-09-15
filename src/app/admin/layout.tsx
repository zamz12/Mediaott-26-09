import Link from "next/link";
import {
  LayoutDashboard, Users, Film, Building2, Tv, Layers, Radio, Tags, Languages, Home,
  Star, Radio as Ticker, Flag, ShieldAlert, AlertTriangle, CreditCard, HardDrive, BarChart3, History, Settings,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

const NAV: { group: string; items: { href: string; label: string; icon: LucideIcon; badgeKey?: "moderation" | "reports" }[] }[] = [
  {
    group: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    group: "People",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/organisations", label: "Organisations", icon: Building2 },
      { href: "/admin/channels", label: "Channels", icon: Tv },
    ],
  },
  {
    group: "Content",
    items: [
      { href: "/admin/content", label: "Content", icon: Film },
      { href: "/admin/series", label: "Series", icon: Layers },
      { href: "/admin/live", label: "Live", icon: Radio },
      { href: "/admin/categories", label: "Categories", icon: Tags },
      { href: "/admin/genres", label: "Genres", icon: Tags },
      { href: "/admin/languages", label: "Languages", icon: Languages },
    ],
  },
  {
    group: "Curation",
    items: [
      { href: "/admin/homepage", label: "Homepage", icon: Home },
      { href: "/admin/featured", label: "Featured Content", icon: Star },
      { href: "/admin/ticker", label: "Ticker", icon: Ticker },
    ],
  },
  {
    group: "Trust & Safety",
    items: [
      { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert, badgeKey: "moderation" },
      { href: "/admin/reports", label: "Reports", icon: Flag, badgeKey: "reports" },
      { href: "/admin/violations", label: "Violations", icon: AlertTriangle },
    ],
  },
  {
    group: "Platform",
    items: [
      { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
      { href: "/admin/storage", label: "Storage", icon: HardDrive },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: History },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [moderationBacklog, openReports] = await Promise.all([
    prisma.moderationCase.count({ where: { status: "PENDING" } }),
    prisma.report.count({ where: { status: "OPEN" } }),
  ]);
  const badgeCounts: Record<string, number> = { moderation: moderationBacklog, reports: openReports };

  return (
    <div className="mx-auto flex max-w-[1800px] gap-6 px-4 py-6 md:px-6">
      <aside className="hidden w-56 shrink-0 lg:block">
        <nav className="sticky top-20 space-y-4">
          {NAV.map((group) => (
            <div key={group.group}>
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">{group.group}</p>
              {group.items.map(({ href, label, icon: Icon, badgeKey }) => {
                const count = badgeKey ? badgeCounts[badgeKey] : 0;
                return (
                  <Link key={href} href={href} className="focus-ring flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-[var(--color-fg-muted)] hover:bg-white/5 hover:text-[var(--color-fg)]">
                    <Icon size={15} /> {label}
                    {count > 0 && (
                      <Badge tone="danger" className="ml-auto">
                        {count}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex gap-1 overflow-x-auto lg:hidden">
          {NAV.flatMap((g) => g.items).map(({ href, label, badgeKey }) => {
            const count = badgeKey ? badgeCounts[badgeKey] : 0;
            return (
              <Link key={href} href={href} className="focus-ring flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs">
                {label}
                {count > 0 && (
                  <Badge tone="danger" className="!px-1.5">
                    {count}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
        {children}
      </div>
    </div>
  );
}
