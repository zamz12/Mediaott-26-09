import { listModerationQueue } from "@/modules/moderation/service";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { decideModerationCaseAction } from "./actions";

export const metadata = { title: "Moderation" };

const REASON_LABEL: Record<string, string> = {
  COPYRIGHT: "Copyright", VIOLENCE: "Violence", SEXUAL_CONTENT: "Sexual content", HATE_ABUSE: "Hate / abuse",
  MISINFORMATION: "Misinformation", SPAM: "Spam", PRIVACY: "Privacy", ILLEGAL_CONTENT: "Illegal content", OTHER: "Other",
};

export default async function AdminModerationPage() {
  const queue = await listModerationQueue();

  const priorViolationCounts = await Promise.all(
    queue.map((c) => prisma.violation.count({ where: { userId: c.content.createdByUserId } })),
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Moderation queue</h1>
      <div className="space-y-4">
        {queue.map((item, i) => (
          <div key={item.id} className="rounded-xl border border-[var(--color-border)] p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{item.content.title}</p>
                <p className="text-xs text-[var(--color-fg-muted)]">
                  by {item.content.channel.ownerUser?.displayName ?? item.content.channel.name} · declares owns: {item.content.ownsContent ? "yes" : "no"}, authorised: {item.content.authorisedToPublish ? "yes" : "no"}
                  {item.content.isAiGenerated && ", AI-generated"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {item.report && <Badge tone="danger">Reported: {REASON_LABEL[item.report.reason]}</Badge>}
                <Badge tone={priorViolationCounts[i] > 0 ? "gold" : "default"}>{priorViolationCounts[i]} prior violations</Badge>
              </div>
            </div>
            {item.report && (
              <p className="mb-2 text-sm text-[var(--color-fg-muted)]">
                Reported by {item.report.reporter.displayName}: {item.report.details ?? "No details provided."}
              </p>
            )}

            <form action={decideModerationCaseAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="moderationCaseId" value={item.id} />
              <div className="flex-1 min-w-[200px]">
                <input name="moderatorNotes" placeholder="Moderator notes" className="focus-ring h-9 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-2 text-sm" />
              </div>
              <select name="violationSeverity" className="focus-ring h-9 rounded-lg border border-[var(--color-border)] bg-transparent px-2 text-sm">
                <option value="">No violation</option>
                <option value="WARNING">Warning</option>
                <option value="MINOR">Minor</option>
                <option value="MAJOR">Major</option>
                <option value="SEVERE">Severe</option>
              </select>
              <Button type="submit" name="decision" value="APPROVED" size="sm">
                Approve
              </Button>
              <Button type="submit" name="decision" value="RESTRICTED" variant="secondary" size="sm">
                Restrict
              </Button>
              <Button type="submit" name="decision" value="TAKEDOWN" variant="danger" size="sm">
                Takedown
              </Button>
            </form>
          </div>
        ))}
        {queue.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">Nothing pending review.</p>}
      </div>
    </div>
  );
}
