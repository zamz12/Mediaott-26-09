import { getSessionUser } from "@/lib/session";
import { isSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { assignAdminSubRoleAction, suspendUserAction, unsuspendUserAction } from "./actions";

export const metadata = { title: "Users" };

const ADMIN_SUB_ROLES = ["SUPER_ADMIN", "CONTENT_ADMIN", "MODERATOR", "SUPPORT_ADMIN", "FINANCE_ADMIN", "ORGANISATION_ADMIN"];

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
