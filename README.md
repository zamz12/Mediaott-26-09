# LOKAL — Malaysian OTT Streaming & Creator Platform

LOKAL is a Malaysian-focused streaming and creator platform: a hybrid of an
OTT viewing experience (Netflix/Disney+/Prime-style), a creator publishing
platform (YouTube/Vimeo-style), and a private cloud video vault, purpose-built
for local films, documentaries, dramas, government/state agency programmes,
and independent creators. "LOKAL" is a placeholder brand name — branding is
admin-configurable (see `/admin/settings`).

This is a working MVP (Phase 1 of the roadmap in `docs/ARCHITECTURE.md`), not
a mockup: every page listed below is backed by real database-driven logic,
server-side authorization, and a genuine media pipeline.

## What's implemented (Phase 1 MVP)

- Auth (Argon2id + Auth.js, JWT sessions) and RBAC (Viewer / Creator /
  Organisation member / Admin, plus Admin sub-roles)
- Cinematic homepage with admin-configurable rows, hero, and ticker
- Catalogue, search, explore/filter, category pages
- Custom HLS video player (resume, subtitles, speed, quality, PiP, keyboard
  shortcuts) with signed, short-lived playback URLs
- 30-second hover/focus preview on video cards
- Channels, subscriptions, series/season/episode model
- Creator Studio: dashboard, resumable direct-to-storage uploads, external
  (YouTube/Vimeo) references, subtitle upload, series/episode management,
  playlists, comments moderation, storage usage
- Personal Video Vault (private storage, publish-to-content flow, quota)
- Admin Control Centre: dashboard, users/creators/organisations/channels,
  content moderation queue, homepage curation, ticker, taxonomy management,
  audit log, subscription plans (billing OFF by default), storage/analytics
- Background transcode/transcription pipeline (BullMQ + Redis), provider
  abstractions for Storage/Transcode/Transcription/Notification/
  Payment/Search so vendors can be swapped without touching business logic
- PWA (manifest, service worker, offline fallback, install prompt)
- Internal analytics event pipeline (debounced watch progress, not
  per-second writes)

Subscriptions/billing, live streaming, AI transcription, and DRM are
intentionally schema-ready but disabled — see `docs/ARCHITECTURE.md` for the
full phase breakdown.

## Tech stack

Next.js 15 (App Router) + React 19 + TypeScript, Tailwind CSS v4, PostgreSQL
+ Prisma, Auth.js v5 (Credentials/Argon2id now, OAuth-ready), Zod, BullMQ +
Redis, hls.js, an S3-compatible `StorageProvider` (AWS `ap-southeast-5` in
production, local-filesystem in dev), Vitest.

## Prerequisites

- Node.js 20+ and pnpm
- PostgreSQL 16 (local install or Docker)
- Redis 7 (local install or Docker)
- Optional: `ffmpeg`/`ffprobe` on PATH for the local transcode worker, and a
  MinIO container for a closer-to-production storage backend

## Run everything with Docker (recommended for one machine, no cloud needed)

This runs the app, worker, PostgreSQL, Redis, and MinIO together, entirely
on your own computer — no cloud account, no manual database install. Needs
[Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/
Mac/Linux) with WSL2 enabled on Windows.

1. Clone the repo and check out this branch, e.g. on Windows:
   ```powershell
   cd "C:\Users\<you>\Downloads"
   git clone https://github.com/zamz12/Mediaott-26-09 "OTT Media App"
   cd "OTT Media App"
   git checkout claude/lokal-ott-streaming-mvp-ixkadf
   ```
2. Create your `.env`:
   ```powershell
   copy .env.example .env
   ```
   Open `.env` in a text editor and set `AUTH_SECRET` to any long random
   string (it just needs to exist — for local-only use the placeholder is
   fine, but don't reuse it if you ever deploy this publicly). Everything
   else in `.env.example` already matches the Docker Compose service names
   and needs no changes for this path.
3. Build and start everything:
   ```powershell
   docker compose up -d --build
   ```
   First run downloads base images and installs dependencies inside the
   containers, so it needs internet access **once**; after that, stopping
   and restarting (`docker compose down` / `docker compose up -d`) works
   fully offline against the data already in the Docker volumes.
4. Watch it come up (optional, `Ctrl+C` to stop watching without stopping
   the containers):
   ```powershell
   docker compose logs -f app
   ```
   Migrations run automatically on the `app` container's startup. Wait for
   a line like `✓ Ready` / `Listening on port 3000`.
5. Seed demo data (one-time — safe to re-run, it upserts):
   ```powershell
   docker compose exec app pnpm db:seed
   ```
6. Open **http://localhost:3000** in your browser. Demo logins (password
   `Password123!` for all): `admin@lokal.my`, `siti@lokal.my`, `viewer@lokal.my`.

**Useful commands:**
```powershell
docker compose ps              # see what's running
docker compose logs -f worker  # transcode/transcription worker logs
docker compose down            # stop everything, keep data
docker compose down -v         # stop everything AND wipe the database/storage
```

Every container this stack creates is named `lokal-*` on its own
`lokal-network`, and every volume is `lokal_*` — so it's safe to run
alongside completely unrelated Docker projects on the same machine without
any port or name collisions (as long as those other projects don't also
claim ports 3000/5432/6379/9000/9001).

Once this runs cleanly end-to-end on your machine, that's the point to talk
about moving it to a real cloud/production environment — the same
`docker-compose.yml`/`Dockerfile` are the starting point for that too.

## Local development (without Docker)

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Start infrastructure.** Either via Docker:

   ```bash
   docker compose up -d postgres redis minio
   ```

   ...or against locally installed PostgreSQL/Redis (no Docker required):

   ```bash
   sudo service postgresql start
   redis-server --daemonize yes
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   # Generate a real secret:
   openssl rand -base64 32
   # Paste it into AUTH_SECRET in .env
   ```

   By default (no `STORAGE_ENDPOINT` set and `NODE_ENV != production`) the
   app uses a local-filesystem `StorageProvider` that writes under
   `.data/storage/` and serves "signed URLs" through
   `/api/storage/[bucket]/[...key]`, so the full upload → playback pipeline
   works without any cloud credentials. Point `STORAGE_ENDPOINT` at MinIO or
   AWS S3 to use the real S3-compatible provider instead.

4. **Create the database and run migrations**

   ```bash
   pnpm db:migrate
   ```

5. **Seed demo data** (Malaysian demo content, roles, taxonomy, demo accounts)

   ```bash
   pnpm db:seed
   ```

   Demo accounts (password `Password123!` for all):
   - `admin@lokal.my` — Super Admin
   - `siti@lokal.my`, `borneo.stories@lokal.my` — Creators (with channels)
   - `viewer@lokal.my` — Viewer

6. **Run the app**

   ```bash
   pnpm dev
   ```

   Visit http://localhost:3000.

7. **Run the background worker** (transcode/transcription — needs `ffmpeg`
   on PATH for real transcodes; without it, uploaded videos will sit in
   `PROCESSING` until ffmpeg is available)

   ```bash
   pnpm worker
   ```

## Useful scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Next.js dev server |
| `pnpm build` / `pnpm start` | Production build / start |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (unit + integration tests) |
| `pnpm db:migrate` | Prisma migrate (dev) |
| `pnpm db:seed` | Seed demo data |
| `pnpm db:studio` | Prisma Studio (DB browser) |
| `pnpm worker` | Start the transcode/transcription worker |

## Testing

`pnpm test` runs:

- Unit tests for the RBAC policy layer and Zod validation schemas
  (`tests/unit/`)
- Integration tests that exercise the real service layer against your local
  PostgreSQL: registration, login-hash verification, browse/search, watch
  progress upserts, channel follow/unfollow, and the full creator upload →
  moderation queue → admin approval → publish pipeline (`tests/integration/`)

Integration tests run against whatever `DATABASE_URL` is configured — point
it at a disposable database if you don't want test fixtures touching your
seeded dev data (fixtures are namespaced and cleaned up in `afterAll`, but a
dedicated test database is recommended for CI).

## Project structure

```
prisma/               schema.prisma, migrations, seed.ts
src/
  app/                 Next.js App Router: public pages, (auth), creator-studio, admin, api/
  modules/             auth, users, organisations, channels, catalogue, media, uploads,
                       streaming, moderation, library, analytics, admin, vault
                       — each as service.ts (+ schema.ts) that routes/actions call into
  components/          design system (ui/, video/, rails/, layout/)
  lib/                 prisma client, auth (Auth.js), rbac policy layer, provider factory
  lib/providers/        StorageProvider, TranscodeProvider, TranscriptionProvider,
                       NotificationProvider, PaymentProvider, SearchProvider (+ impls)
  workers/             transcode.worker.ts, transcript.worker.ts (run via `pnpm worker`)
public/                manifest.webmanifest, sw.js, offline.html, icons/
docs/                  ARCHITECTURE.md, ERD.md
tests/                 unit/, integration/
```

Business logic lives in `src/modules/*/service.ts`, never in route handlers
or server actions directly — actions/routes validate input (Zod), check
authorization (`src/lib/rbac.ts`), call a service, and revalidate/redirect.

## Production deployment (target architecture)

See `docs/ARCHITECTURE.md` for the full picture. Summary: AWS `ap-southeast-5`
(Malaysia) — ECS Fargate/Amplify for the app, RDS PostgreSQL, ElastiCache
Redis, S3 (private buckets, signed URLs, lifecycle rules) for
`/masters /transcoded /previews /thumbnails /subtitles /private-vault /temporary`,
CloudFront in front of S3 for signed-URL delivery, MediaConvert (or the same
local-ffmpeg worker on Fargate) for transcoding, Secrets Manager for
credentials. None of this is hard-wired into the app — swap any of it by
implementing the relevant interface in `src/lib/providers/`.

## Security notes

- Passwords: Argon2id (`src/lib/password.ts`)
- Sessions: Auth.js JWT sessions; `src/lib/rbac.ts` is asserted server-side in
  every mutating server action — middleware route-gating is a UX convenience,
  never the only check
- Media: master files are never public; all reads go through short-lived
  signed URLs (`StorageProvider.getSignedReadUrl`)
- Every admin/moderation decision writes an `AuditLog` row
- Secrets are read from environment variables only (`.env`, never committed)
