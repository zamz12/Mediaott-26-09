import { prisma } from "@/lib/prisma";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createPlanAction } from "./actions";

export const metadata = { title: "Subscriptions" };

export default async function AdminSubscriptionsPage() {
  const plans = await prisma.subscriptionPlan.findMany({ orderBy: { priceCents: "asc" } });
  const billingEnabled = process.env.BILLING_ENABLED === "true";

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">Subscriptions</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">
        Billing is <strong>{billingEnabled ? "enabled" : "disabled"}</strong> platform-wide (Section 37). Plans can be
        configured now; they activate once a PaymentProvider is wired up.
      </p>

      <form action={createPlanAction} className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-[var(--color-border)] p-4">
        <Input name="name" placeholder="Plan name" required className="col-span-2" />
        <select name="tier" className="focus-ring h-11 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm">
          <option value="BASIC">BASIC</option>
          <option value="PREMIUM">PREMIUM</option>
          <option value="CREATOR">CREATOR</option>
          <option value="ORGANISATION">ORGANISATION</option>
        </select>
        <select name="billingPeriod" className="focus-ring h-11 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm">
          <option value="MONTHLY">Monthly</option>
          <option value="ANNUAL">Annual</option>
        </select>
        <Input name="priceCents" type="number" placeholder="Price (cents, MYR)" className="col-span-2" />
        <Button type="submit" className="col-span-2">
          Create plan (draft)
        </Button>
      </form>

      <ul className="space-y-2">
        {plans.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3 text-sm">
            <span>
              {p.name} — {p.tier} · {(p.priceCents / 100).toFixed(2)} {p.currency}/{p.billingPeriod?.toLowerCase()}
            </span>
            <Badge tone={p.isActive ? "success" : "default"}>{p.isActive ? "Active" : "Draft"}</Badge>
          </li>
        ))}
        {plans.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">No plans configured yet.</p>}
      </ul>
    </div>
  );
}
