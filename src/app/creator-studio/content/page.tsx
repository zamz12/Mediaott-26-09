import Link from "next/link";
import { requireSessionUser } from "@/lib/session";
import { getMyChannels, listMyContent } from "@/modules/media/service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EmptyCreatorLibrary } from "@/components/empty-states";
import { deleteContentAction } from "./[id]/actions";

export const metadata = { title: "Content" };

const STATUS_TONE: Record<string, "default" | "accent" | "gold" | "danger" | "success"> = {
  DRAFT: "default",
  UPLOADING: "gold",
  PROCESSING: "gold",
  READY: "accent",
  PUBLISHED: "success",
  SCHEDULED: "accent",
  UNDER_REVIEW: "gold",
  RESTRICTED: "danger",
  TAKEDOWN: "danger",
  ARCHIVED: "default",
};

export default async function CreatorContentPage() {
  const user = await requireSessionUser();
  const channels = await getMyChannels(user.id);
  const content = await listMyContent(channels.map((c) => c.id));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Content</h1>
        <Button href="/creator-studio/upload">Upload video</Button>
      </div>

      {content.length === 0 ? (
        <EmptyCreatorLibrary />
      ) : (
        <ul className="space-y-2">
          {content.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-[var(--color-border)] p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.title}</p>
                <p className="text-xs text-[var(--color-fg-muted)]">{item.category?.label ?? "Uncategorised"} · {item.visibility}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge tone={STATUS_TONE[item.status]}>{item.status.replace("_", " ")}</Badge>
                <Link href={`/creator-studio/content/${item.id}`} className="text-sm text-[var(--color-accent)]">
                  Edit
                </Link>
                <form action={deleteContentAction.bind(null, item.id)}>
                  <ConfirmSubmitButton
                    variant="ghost"
                    size="sm"
                    className="!h-auto !px-0 text-[var(--color-danger)] hover:!bg-transparent hover:underline"
                    confirmMessage={`Delete "${item.title}" permanently? This removes the video file and cannot be undone.`}
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
