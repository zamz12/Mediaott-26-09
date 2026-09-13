import { getSessionUser } from "@/lib/session";
import { isSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { assignAdminSubRoleAction, createUserAction, suspendUserAction, unsuspendUserAction } from "./actions";

export const metadata = { title: "Users" };

const ADMIN_SUB_ROLES = ["SUPER_ADMIN", "CONTENT_ADMIN", "MODERATOR", "SUPPORT_ADMIN", "FINANCE_ADMIN", "ORGANISATION_ADMIN"];
const PLATFORM_ROLES = ["VIEWER", "CREATOR", "ADMIN"];

export default async function AdminUsersPage() {
  const sessionUser = await getSessionUser();
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { userRoles: { include: { role: true } }, adminSubRoles: true },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Users</h1>

      {sessionUser && isSuperAdmin(sessionUser) && (
        <details className="mb-6 rounded-xl border border-[var(--color-border)] p-4">
          <summary className="cursor-pointer text-sm font-medium">Create platform account</summary>
          <form action={createUserAction} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" name="displayName" required />
            </div>
            <div>
              <Label htmlFor="handle">Handle</Label>
              <Input id="handle" name="handle" required pattern="[a-z0-9_]+" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="password">Temporary password</Label>
              <Input id="password" name="password" type="password" minLength={10} required />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <select id="role" name="role" className="focus-ring h-11 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm">
                {PLATFORM_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="adminSubRole">Admin sub-role (if ADMIN)</Label>
              <select id="adminSubRole" name="adminSubRole" className="focus-ring h-11 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm">
                <option value="">—</option>
                {ADMIN_SUB_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Create account</Button>
            </div>
          </form>
        </details>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[var(--color-fg-muted)]">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Roles</th>
              <th className="p-2">Tier</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-[var(--color-border)]">
                <td className="p-2">
                  <p className="font-medium">{u.displayName}</p>
                  <p className="text-xs text-[var(--color-fg-muted)]">{u.email}</p>
                </td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1">
                    {u.userRoles.map((r) => (
                      <Badge key={r.id}>{r.role.name}</Badge>
                    ))}
                    {u.adminSubRoles.map((a) => (
                      <Badge key={a.id} tone="gold">
                        {a.subRole}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="p-2">{u.subscriptionTier}</td>
                <td className="p-2">
                  <Badge tone={u.isSuspended ? "danger" : "success"}>{u.isSuspended ? "Suspended" : "Active"}</Badge>
                </td>
                <td className="p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {u.isSuspended ? (
                      <form action={unsuspendUserAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <Button type="submit" size="sm" variant="secondary">
                          Unsuspend
                        </Button>
                      </form>
                    ) : (
                      <form action={suspendUserAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <Button type="submit" size="sm" variant="danger">
                          Suspend
                        </Button>
                      </form>
                    )}
                    {sessionUser && isSuperAdmin(sessionUser) && (
                      <form action={assignAdminSubRoleAction} className="flex items-center gap-1">
                        <input type="hidden" name="userId" value={u.id} />
                        <select name="subRole" className="focus-ring h-8 rounded-lg border border-[var(--color-border)] bg-transparent px-1 text-xs">
                          {ADMIN_SUB_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" size="sm" variant="ghost">
                          Grant
                        </Button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
