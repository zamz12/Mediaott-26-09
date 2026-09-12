import { requireSessionUser } from "@/lib/session";
import { getMyChannels, listMyContent } from "@/modules/media/service";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Copyright" };

export default async function CreatorCopyrightPage() {
  const user = await requireSessionUser();
  const channelIds = (await getMyChannels(user.id)).map((c) => c.id);
  const content = await listMyContent(channelIds);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">Copyright & ownership</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">
        Every upload&apos;s ownership and authorisation declarations, for your own records.
      </p>
      <ul className="space-y-2">
        {content.map((c) => (
          <li key={c.id} className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
            <p className="mb-2 font-medium">{c.title}</p>
            <div className="flex flex-wrap gap-2">
              <Badge tone={c.ownsContent ? "success" : "danger"}>{c.ownsContent ? "Owns content" : "Does not own"}</Badge>
              <Badge tone={c.authorisedToPublish ? "success" : "danger"}>{c.authorisedToPublish ? "Authorised" : "Not authorised"}</Badge>
              {c.isAiGenerated && <Badge tone="accent">AI-generated</Badge>}
              {c.containsPaidPromotion && <Badge tone="gold">Paid promotion</Badge>}
            </div>
          </li>
        ))}
        {content.length === 0 && <p className="text-sm text-[var(--color-fg-muted)]">Nothing uploaded yet.</p>}
      </ul>
    </div>
  );
}
