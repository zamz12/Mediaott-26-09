import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getAccountOverview } from "@/modules/users/service";
import { listLanguages } from "@/modules/catalogue/service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { becomeCreatorAction, revokeDeviceSessionAction, signOutAction } from "./actions";
import { LanguageForm } from "./language-form";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login?callbackUrl=/account");

  const [account, languages] = await Promise.all([getAccountOverview(sessionUser.id), listLanguages()]);
  const isCreator = account.userRoles.some((r) => r.role.name === "CREATOR");

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-10">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl font-bold">
          {account.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold">{account.displayName}</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">@{account.handle}</p>
        </div>
        <Badge tone="gold" className="ml-auto">
          {account.subscriptionTier}
        </Badge>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Log out
          </Button>
        </form>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/my-list" className="rounded-xl border border-[var(--color-border)] p-4 text-center hover:border-[var(--color-accent)]">
          My List
        </Link>
        <Link href="/account/history" className="rounded-xl border border-[var(--color-border)] p-4 text-center hover:border-[var(--color-accent)]">
          Watch History
        </Link>
        <Link href="/account/vault" className="rounded-xl border border-[var(--color-border)] p-4 text-center hover:border-[var(--color-accent)]">
          Video Vault
        </Link>
        <Link href="/account/appearance" className="rounded-xl border border-[var(--color-border)] p-4 text-center hover:border-[var(--color-accent)]">
          Appearance
        </Link>
        <Link href="/messages" className="rounded-xl border border-[var(--color-border)] p-4 text-center hover:border-[var(--color-accent)]">
          Messages
        </Link>
        {isCreator ? (
          <Link href="/creator-studio" className="rounded-xl border border-[var(--color-gold)] p-4 text-center text-[var(--color-gold)]">
            Creator Studio
          </Link>
        ) : (
          <form action={becomeCreatorAction}>
            <button type="submit" className="focus-ring h-full w-full rounded-xl border border-[var(--color-border)] p-4 text-center hover:border-[var(--color-accent)]">
              Become a Creator
            </button>
          </form>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">Preferred language</h2>
        <LanguageForm languages={languages} selectedId={account.profile?.preferredLanguageId} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">Devices</h2>
        <ul className="space-y-2">
          {account.deviceSessions.map((device) => (
            <li key={device.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3 text-sm">
              <div>
                <p>{device.deviceName ?? device.userAgent ?? "Unknown device"}</p>
                <p className="text-xs text-[var(--color-fg-muted)]">Last active {device.lastActiveAt.toLocaleString("en-MY")}</p>
              </div>
              <form action={revokeDeviceSessionAction}>
                <input type="hidden" name="sessionId" value={device.id} />
                <Button variant="ghost" size="sm" type="submit">
                  Sign out
                </Button>
              </form>
            </li>
          ))}
          {account.deviceSessions.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No other active sessions.</p>}
        </ul>
      </section>

      <section className="border-t border-[var(--color-border)] pt-6 text-sm text-[var(--color-fg-muted)]">
        <div className="flex flex-wrap gap-4">
          <Link href="/privacy-policy" className="hover:text-[var(--color-fg)]">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-[var(--color-fg)]">
            Terms of Service
          </Link>
          <Link href="/community-guidelines" className="hover:text-[var(--color-fg)]">
            Community Guidelines
          </Link>
        </div>
      </section>
    </div>
  );
}
