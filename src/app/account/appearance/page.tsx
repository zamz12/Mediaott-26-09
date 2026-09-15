import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { AppearanceSettings } from "./appearance-settings";

export const metadata = { title: "Appearance" };

export default async function AppearancePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/account/appearance");

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link href="/account" className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">
        <ArrowLeft size={14} /> Account
      </Link>
      <h1 className="mb-1 text-2xl font-bold">Appearance</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">Personalize your accent color and interface size — synced to your account.</p>
      <AppearanceSettings />
    </div>
  );
}
