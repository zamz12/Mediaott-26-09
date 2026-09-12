import { getBranding } from "@/modules/admin/branding";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateBrandingAction } from "./actions";

export const metadata = { title: "Settings" };

const FLAGS = [
  { key: "FEATURE_LIVE_STREAMING", label: "Live streaming" },
  { key: "FEATURE_AI_TRANSCRIPTION", label: "AI transcription" },
  { key: "FEATURE_SUBSCRIPTIONS", label: "Subscriptions" },
  { key: "BILLING_ENABLED", label: "Billing" },
];

export default async function AdminSettingsPage() {
  const branding = await getBranding();

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="mb-4 text-2xl font-bold">Platform branding</h1>
        <form action={updateBrandingAction} className="space-y-3">
          <div>
            <Label htmlFor="name">Platform name</Label>
            <Input id="name" name="name" defaultValue={branding.name} required />
          </div>
          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" name="tagline" defaultValue={branding.tagline} />
          </div>
          <Button type="submit">Save branding</Button>
        </form>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Feature flags</h2>
        <ul className="space-y-2">
          {FLAGS.map((f) => (
            <li key={f.key} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3 text-sm">
              {f.label}
              <Badge tone={process.env[f.key] === "true" ? "success" : "default"}>{process.env[f.key] === "true" ? "On" : "Off"}</Badge>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-[var(--color-fg-muted)]">Feature flags are environment-configured for safety; change them via deployment configuration.</p>
      </div>
    </div>
  );
}
