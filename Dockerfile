# Single-VM image for LOKAL. Builds one image and reuses it for both the
# Next.js app and the background worker (only the CMD differs) — correctness
# and simplicity over image size for the first pass; the standalone/pruned
# variant is a later optimization once this runs cleanly end to end.

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# --- App (Next.js server) ---------------------------------------------------
FROM builder AS app
ENV NODE_ENV=production
EXPOSE 3000
ENV PORT=3000
CMD ["pnpm", "start"]

# --- Worker (transcode/transcription, BullMQ) -------------------------------
FROM builder AS worker
ENV NODE_ENV=production
CMD ["pnpm", "worker"]
