import Link from "next/link";
import { LayoutDashboard, Film, Upload, Layers, Radio, ListVideo, MessageSquare, ShieldCheck, HardDrive, Settings, Tv } from "lucide-react";

const NAV = [
  { href: "/creator-studio", label: "Dashboard", icon: LayoutDashboard },
  { href: "/creator-studio/content", label: "Content", icon: Film },
  { href: "/creator-studio/upload", label: "Upload", icon: Upload },
  { href: "/creator-studio/series", label: "Series", icon: Layers },
  { href: "/creator-studio/live", label: "Live", icon: Radio },
  { href: "/creator-studio/playlists", label: "Playlists", icon: ListVideo },
  { href: "/creator-studio/comments", label: "Comments", icon: MessageSquare },
  { href: "/creator-studio/copyright", label: "Copyright", icon: ShieldCheck },
  { href: "/creator-studio/storage", label: "Storage", icon: HardDrive },
  { href: "/creator-studio/channel", label: "Channel", icon: Tv },
  { href: "/creator-studio/settings", label: "Settings", icon: Settings },
];

export default function CreatorStudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6">
      <aside className="hidden w-56 shrink-0 md:block">
        <nav className="sticky top-20 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="focus-ring flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-fg-muted)] hover:bg-white/5 hover:text-[var(--color-fg)]">
              <Icon size={16} /> {label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex gap-1 overflow-x-auto md:hidden">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} className="focus-ring shrink-0 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs">
              {label}
            </Link>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}
