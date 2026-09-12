import { notFound } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listCategories, listGenres, listLanguages } from "@/modules/catalogue/service";
import { listSubtitles } from "@/modules/media/subtitles";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addSubtitleAction, archiveContentAction, submitForReviewAction, updateMetadataAction } from "./actions";

const CONTENT_TYPES = [
  "MOVIE", "DRAMA", "SERIES", "EPISODE", "DOCUMENTARY", "SHORT_FILM", "AI_PRODUCTION", "ANIMATION",
  "EDUCATION", "NEWS", "EVENT", "LIVE", "PODCAST", "MUSIC", "COMMUNITY", "GOVERNMENT", "TOURISM", "CULTURE", "PERSONAL",
];
const VISIBILITIES = ["PUBLIC", "UNLISTED", "PRIVATE", "MEMBERS_ONLY", "ORGANISATION_ONLY", "SCHEDULED"];
const RATINGS = [
  { value: "U", label: "U — General" },
  { value: "P13", label: "P13" },
  { value: "SIXTEEN", label: "16" },
  { value: "EIGHTEEN", label: "18" },
];

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSessionUser();

  const content = await prisma.content.findFirst({
    where: { id, channel: { ownerUserId: user.id } },
    include: { genres: true, videoAssets: true },
  });
  if (!content) notFound();

  const [categories, genres, languages] = await Promise.all([listCategories(), listGenres(), listLanguages()]);
  const asset = content.videoAssets[0];
  const subtitles = asset ? await listSubtitles(asset.id) : [];
  const selectedGenreIds = new Set(content.genres.map((g) => g.genreId));

  const boundUpdate = updateMetadataAction.bind(null, content.id);
  const boundSubmit = submitForReviewAction.bind(null, content.id);
  const boundArchive = archiveContentAction.bind(null, content.id);

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">{content.title}</h1>
        <Badge>{content.status.replace("_", " ")}</Badge>
      </div>

      <form action={boundUpdate} className="space-y-5">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={content.title} required />
        </div>

        <div>
          <Label htmlFor="synopsis">Synopsis</Label>
          <Textarea id="synopsis" name="synopsis" rows={3} defaultValue={content.synopsis ?? ""} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contentType">Content type</Label>
            <select id="contentType" name="contentType" defaultValue={content.contentType} className="focus-ring h-11 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm">
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="categoryId">Category</Label>
            <select id="categoryId" name="categoryId" defaultValue={content.categoryId ?? ""} className="focus-ring h-11 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm">
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label>Genres / themes</Label>
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => (
              <label key={g.id} className="cursor-pointer">
                <input type="checkbox" name="genreIds" value={g.id} defaultChecked={selectedGenreIds.has(g.id)} className="peer sr-only" />
                <span className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm peer-checked:border-[var(--color-accent)] peer-checked:text-[var(--color-accent)]">
                  {g.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="originalLanguageId">Original language</Label>
            <select id="originalLanguageId" name="originalLanguageId" defaultValue={content.originalLanguageId ?? ""} className="focus-ring h-11 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm">
              <option value="">—</option>
              {languages.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="releaseYear">Release year</Label>
            <Input id="releaseYear" name="releaseYear" type="number" defaultValue={content.releaseYear ?? ""} />
          </div>
        </div>

        <div>
          <Label>Content rating</Label>
          <div className="flex gap-3">
            {RATINGS.map((r) => (
              <label key={r.value} className="flex items-center gap-1.5 text-sm">
                <input type="radio" name="rating" value={r.value} defaultChecked={content.rating === r.value} required />
                {r.label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="visibility">Visibility</Label>
            <select id="visibility" name="visibility" defaultValue={content.visibility} className="focus-ring h-11 w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm">
              {VISIBILITIES.map((v) => (
                <option key={v} value={v}>
                  {v.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="scheduledAt">Scheduled publish time</Label>
            <Input id="scheduledAt" name="scheduledAt" type="datetime-local" defaultValue={content.scheduledAt?.toISOString().slice(0, 16) ?? ""} />
          </div>
        </div>

        <fieldset className="space-y-2 rounded-lg border border-[var(--color-border)] p-4">
          <legend className="px-1 text-sm font-medium">Declarations</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="ownsContent" defaultChecked={content.ownsContent} /> I own this content
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="authorisedToPublish" defaultChecked={content.authorisedToPublish} /> I am authorised to publish this content
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isAiGenerated" defaultChecked={content.isAiGenerated} /> AI-generated / AI-assisted
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="containsPaidPromotion" defaultChecked={content.containsPaidPromotion} /> Contains paid promotion
          </label>
        </fieldset>

        <div className="flex gap-3">
          <Button type="submit">Save changes</Button>
        </div>
      </form>

      {asset && (
        <section className="mt-8 border-t border-[var(--color-border)] pt-6">
          <h2 className="mb-3 text-lg font-semibold">Subtitles</h2>
          <ul className="mb-4 space-y-1 text-sm">
            {subtitles.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <span>{s.language.label}</span>
                <Badge tone={s.isReviewed ? "success" : "gold"}>{s.isReviewed ? "Reviewed" : "Needs review"}</Badge>
                <span className="text-[var(--color-fg-muted)]">{s.format}</span>
              </li>
            ))}
            {subtitles.length === 0 && <li className="text-[var(--color-fg-muted)]">No subtitles yet.</li>}
          </ul>

          <form action={addSubtitleAction.bind(null, content.id, asset.id)} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <select name="languageId" required className="focus-ring h-11 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm">
                {languages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
              <select name="format" className="focus-ring h-11 rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-sm">
                <option value="VTT">VTT</option>
                <option value="SRT">SRT</option>
              </select>
            </div>
            <Textarea name="content" rows={4} placeholder="Paste subtitle file contents…" required />
            <Button type="submit" size="sm">
              Upload subtitle
            </Button>
          </form>
        </section>
      )}

      <section className="mt-8 flex items-center gap-3 border-t border-[var(--color-border)] pt-6">
        {content.status === "DRAFT" && (
          <form action={boundSubmit}>
            <Button type="submit" disabled={!asset}>
              {asset ? "Submit for review" : "Attach a video first"}
            </Button>
          </form>
        )}
        <form action={boundArchive}>
          <Button type="submit" variant="ghost">
            Archive
          </Button>
        </form>
      </section>
    </div>
  );
}
