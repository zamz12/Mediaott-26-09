import { Radio } from "lucide-react";

export const metadata = { title: "Live" };

export default function CreatorLivePage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] py-20 text-center">
      <Radio className="text-[var(--color-fg-muted)]" size={28} />
      <h1 className="text-lg font-semibold">Live streaming — coming in Phase 2</h1>
      <p className="max-w-sm text-sm text-[var(--color-fg-muted)]">
        The data model already supports HLS pull and approved external embeds; RTMP/SRT ingestion and the go-live
        controls ship in Phase 2.
      </p>
    </div>
  );
}
