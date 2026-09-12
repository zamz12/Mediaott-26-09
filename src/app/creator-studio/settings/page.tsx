import Link from "next/link";

export const metadata = { title: "Creator Settings" };

export default function CreatorSettingsPage() {
  return (
    <div className="max-w-lg space-y-3">
      <h1 className="mb-4 text-2xl font-bold">Settings</h1>
      <Link href="/creator-studio/channel" className="block rounded-lg border border-[var(--color-border)] p-4 hover:border-[var(--color-accent)]">
        Channel profile, banner &amp; description
      </Link>
      <Link href="/account" className="block rounded-lg border border-[var(--color-border)] p-4 hover:border-[var(--color-accent)]">
        Account &amp; notification preferences
      </Link>
      <p className="pt-4 text-xs text-[var(--color-fg-muted)]">
        Monetisation and payout settings become available once billing is enabled (Phase 3).
      </p>
    </div>
  );
}
