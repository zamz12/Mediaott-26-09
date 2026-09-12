import { prisma } from "@/lib/prisma";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addOrganisationMemberAction, createOrganisationAction } from "./actions";

export const metadata = { title: "Organisations" };

const ORG_ROLES = ["OWNER", "ADMIN", "EDITOR", "UPLOADER", "ANALYST", "VIEWER"];

export default async function AdminOrganisationsPage() {
  const organisations = await prisma.organisation.findMany({
    where: { deletedAt: null },
    include: { members: { include: { user: { select: { displayName: true, email: true } } } }, channels: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-bold">Organisations</h1>
        <p className="mb-4 text-sm text-[var(--color-fg-muted)]">
          Government departments, state agencies, universities, NGOs and production houses (Section 3).
        </p>
        <form action={createOrganisationAction} className="flex flex-wrap gap-2">
          <Input name="name" placeholder="Organisation name" required />
          <Input name="type" placeholder="Type, e.g. State Agency" required />
          <Button type="submit">Create</Button>
        </form>
      </div>

      {organisations.map((org) => (
        <div key={org.id} className="rounded-xl border border-[var(--color-border)] p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">{org.name}</h2>
            <Badge>{org.type}</Badge>
          </div>
          <p className="mb-3 text-xs text-[var(--color-fg-muted)]">{org.channels.length} channel(s)</p>

          <ul className="mb-3 space-y-1 text-sm">
            {org.members.map((m) => (
              <li key={m.id} className="flex justify-between">
                <span>{m.user.displayName}</span>
                <span className="text-[var(--color-fg-muted)]">{m.role}</span>
              </li>
            ))}
            {org.members.length === 0 && <li className="text-[var(--color-fg-muted)]">No members yet.</li>}
          </ul>

          <form action={addOrganisationMemberAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="organisationId" value={org.id} />
            <Input name="email" type="email" placeholder="Member email" className="h-9 flex-1" required />
            <select name="role" className="focus-ring h-9 rounded-lg border border-[var(--color-border)] bg-transparent px-2 text-sm">
              {ORG_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="secondary">
              Add member
            </Button>
          </form>
        </div>
      ))}
    </div>
  );
}
