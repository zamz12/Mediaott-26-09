import { PrismaClient, type HomepageAlgorithm, type Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import { readFile } from "fs/promises";
import path from "path";
import { getStorageProvider, getTranscodeProviderAsync } from "@/lib/providers";

const prisma = new PrismaClient();

// Runs each demo title's bundled clip (prisma/seed-assets/*.mp4 — short,
// generated placeholder footage, not stock/licensed video) through the real
// PLATFORM upload + transcode pipeline, exactly like a creator's own
// upload — real HLS renditions, a real thumbnail, and a real hover-preview
// clip, instead of every title sharing one static poster and one external
// video. Requires ffmpeg wherever the seed runs (the `worker` image has it;
// `app` does not — run `pnpm db:seed` inside the worker container).
async function ingestSeedVideo(contentId: string, videoFileName: string): Promise<number | null> {
  const storage = getStorageProvider();
  const buffer = await readFile(path.join(process.cwd(), "prisma", "seed-assets", videoFileName));
  const masterKey = `seed/${contentId}/${videoFileName}`;
  await storage.putObject("masters", masterKey, buffer, "video/mp4");

  const asset = await prisma.videoAsset.create({
    data: { contentId, sourceType: "PLATFORM", masterStorageKey: masterKey },
  });

  const provider = await getTranscodeProviderAsync();
  const result = await provider.transcode({ videoAssetId: asset.id, masterBucket: "masters", masterKey });

  await prisma.videoAsset.update({
    where: { id: asset.id },
    data: {
      hlsManifestKey: result.hlsManifestKey,
      thumbnailStorageKey: result.thumbnailKey,
      previewStorageKey: result.previewKey,
      durationSeconds: result.durationSeconds || undefined,
    },
  });
  await Promise.all(
    result.renditions.map((r) =>
      prisma.videoRendition.upsert({
        where: { videoAssetId_resolution: { videoAssetId: asset.id, resolution: r.resolution } },
        update: { bitrateKbps: r.bitrateKbps, storageKey: r.storageKey },
        create: { videoAssetId: asset.id, resolution: r.resolution, bitrateKbps: r.bitrateKbps, storageKey: r.storageKey },
      }),
    ),
  );

  return result.durationSeconds || null;
}

async function main() {
  console.log("Seeding LOKAL demo data…");

  // --- RBAC: roles & permissions -------------------------------------------------
  const roleNames = ["VIEWER", "CREATOR", "ORGANISATION_MEMBER", "ADMIN"] as const;
  const roles: Record<string, { id: string }> = {};
  for (const name of roleNames) {
    roles[name] = await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }

  // --- Languages (Section 10) -----------------------------------------------------
  const languageSeeds = [
    { code: "ms-MY", label: "Bahasa Melayu", isUiLanguage: true },
    { code: "en-MY", label: "English", isUiLanguage: true },
    { code: "zh-MY", label: "Chinese", isUiLanguage: true },
    { code: "ta-MY", label: "Tamil", isUiLanguage: true },
    { code: "ko-KR", label: "Korean", isUiLanguage: false },
  ];
  const languages: Record<string, { id: string }> = {};
  for (const l of languageSeeds) {
    languages[l.code] = await prisma.language.upsert({ where: { code: l.code }, update: {}, create: l });
  }

  // --- Categories (Section 9/25) ---------------------------------------------------
  const categorySeeds = [
    { key: "malaysian-stories", label: "Malaysian Stories" },
    { key: "drama", label: "Drama" },
    { key: "documentary", label: "Documentary" },
    { key: "short-films", label: "Short Films" },
    { key: "ai-productions", label: "AI Productions" },
    { key: "independent-creators", label: "Independent Creators" },
    { key: "government-community", label: "Government & Community" },
    { key: "culture-heritage", label: "Culture & Heritage" },
    { key: "education", label: "Education" },
  ];
  const categories: Record<string, { id: string }> = {};
  for (const [i, c] of categorySeeds.entries()) {
    categories[c.key] = await prisma.category.upsert({ where: { key: c.key }, update: {}, create: { ...c, sortOrder: i } });
  }

  // --- Genres (Section 9) ------------------------------------------------------
  const genreSeeds = [
    "Action", "Comedy", "Drama", "Romance", "Horror", "Mystery", "History", "Culture", "Technology",
    "AI", "Food", "Travel", "Education", "Lifestyle", "Sports", "Religion", "Community", "Kids", "Other",
  ];
  const genres: Record<string, { id: string }> = {};
  for (const [i, label] of genreSeeds.entries()) {
    const key = label.toLowerCase();
    genres[key] = await prisma.genre.upsert({ where: { key }, update: {}, create: { key, label, sortOrder: i } });
  }

  // --- Demo users ---------------------------------------------------------------
  const passwordHash = await argon2.hash("Password123!", { type: argon2.argon2id });

  const admin = await prisma.user.upsert({
    where: { email: "admin@lokal.my" },
    update: {},
    create: {
      email: "admin@lokal.my",
      handle: "lokal_admin",
      displayName: "LOKAL Admin",
      passwordHash,
      userRoles: { create: { roleId: roles.ADMIN.id } },
      adminSubRoles: { create: { subRole: "SUPER_ADMIN" } },
      profile: { create: {} },
      storageQuota: { create: {} },
    },
  });

  const creatorSeeds = [
    { email: "siti@lokal.my", handle: "siti_filem", name: "Siti Films" },
    { email: "borneo.stories@lokal.my", handle: "borneo_stories", name: "Borneo Stories" },
  ];
  const creators = [];
  for (const c of creatorSeeds) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        handle: c.handle,
        displayName: c.name,
        passwordHash,
        subscriptionTier: "CREATOR",
        userRoles: { create: [{ roleId: roles.VIEWER.id }, { roleId: roles.CREATOR.id }] },
        profile: { create: {} },
        storageQuota: { create: {} },
      },
    });
    creators.push(user);
  }

  await prisma.user.upsert({
    where: { email: "viewer@lokal.my" },
    update: {},
    create: {
      email: "viewer@lokal.my",
      handle: "demo_viewer",
      displayName: "Demo Viewer",
      passwordHash,
      userRoles: { create: { roleId: roles.VIEWER.id } },
      profile: { create: { preferredLanguageId: languages["ms-MY"].id } },
      storageQuota: { create: {} },
    },
  });

  // --- Organisation (Section 3) --------------------------------------------------
  const org = await prisma.organisation.upsert({
    where: { slug: "jabatan-warisan-negara" },
    update: {},
    create: { name: "Jabatan Warisan Negara", slug: "jabatan-warisan-negara", type: "Government Department", isVerified: true },
  });
  await prisma.organisationMember.upsert({
    where: { organisationId_userId: { organisationId: org.id, userId: admin.id } },
    update: {},
    create: { organisationId: org.id, userId: admin.id, role: "OWNER" },
  });

  // --- Channels -------------------------------------------------------------------
  const channelSitiFilm = await prisma.channel.upsert({
    where: { slug: "siti-films" },
    update: {},
    create: { name: "Siti Films", slug: "siti-films", ownerUserId: creators[0].id, isVerified: true, description: "Independent short films from Kuala Lumpur." },
  });
  const channelBorneo = await prisma.channel.upsert({
    where: { slug: "borneo-stories" },
    update: {},
    create: { name: "Borneo Stories", slug: "borneo-stories", ownerUserId: creators[1].id, description: "Documenting the people and places of Borneo." },
  });
  const channelWarisan = await prisma.channel.upsert({
    where: { slug: "warisan-negara" },
    update: {},
    create: { name: "Warisan Negara", slug: "warisan-negara", organisationId: org.id, isVerified: true, description: "Official heritage and culture programming." },
  });

  // --- Demo content (Section 41) ---------------------------------------------------
  const contentSeeds = [
    { title: "Jejak Melaka", slug: "jejak-melaka", channelId: channelWarisan.id, category: "culture-heritage", genres: ["history", "culture"], type: "DOCUMENTARY" as const, synopsis: "Tracing the historic trade routes and living heritage of Melaka.", videoFile: "jejak-melaka.mp4", countryCode: "MY" },
    { title: "Cerita Dari Borneo", slug: "cerita-dari-borneo", channelId: channelBorneo.id, category: "documentary", genres: ["culture", "travel"], type: "DOCUMENTARY" as const, synopsis: "Stories from the longhouses and rainforests of Borneo.", videoFile: "cerita-dari-borneo.mp4", countryCode: "MY" },
    { title: "Teknologi Kita", slug: "teknologi-kita", channelId: channelSitiFilm.id, category: "education", genres: ["technology"], type: "EDUCATION" as const, synopsis: "A look at homegrown Malaysian technology innovation.", videoFile: "teknologi-kita.mp4", countryCode: "MY" },
    { title: "Suara Komuniti", slug: "suara-komuniti", channelId: channelWarisan.id, category: "government-community", genres: ["community"], type: "COMMUNITY" as const, synopsis: "Community voices from across the nation.", videoFile: "suara-komuniti.mp4", countryCode: "MY" },
    { title: "AI Malaysia", slug: "ai-malaysia", channelId: channelSitiFilm.id, category: "ai-productions", genres: ["ai", "technology"], type: "AI_PRODUCTION" as const, synopsis: "An AI-assisted exploration of Malaysia's future cities.", videoFile: "ai-malaysia.mp4", countryCode: "MY" },
    { title: "Warisan Nusantara", slug: "warisan-nusantara", channelId: channelWarisan.id, category: "culture-heritage", genres: ["culture", "history"], type: "CULTURE" as const, synopsis: "Celebrating the shared heritage of the Nusantara region.", videoFile: "warisan-nusantara.mp4", countryCode: "ID" },
    { title: "Dokumentari Sungai", slug: "dokumentari-sungai", channelId: channelBorneo.id, category: "documentary", genres: ["travel", "culture"], type: "DOCUMENTARY" as const, synopsis: "Life along Malaysia's great rivers.", videoFile: "dokumentari-sungai.mp4", countryCode: "MY" },
    { title: "Cerita Pendek KL", slug: "cerita-pendek-kl", channelId: channelSitiFilm.id, category: "short-films", genres: ["drama"], type: "SHORT_FILM" as const, synopsis: "A short film anthology set in Kuala Lumpur.", videoFile: "cerita-pendek-kl.mp4", countryCode: "MY" },
  ];

  for (const c of contentSeeds) {
    const owner = c.channelId === channelWarisan.id ? admin.id : c.channelId === channelBorneo.id ? creators[1].id : creators[0].id;

    const content = await prisma.content.upsert({
      where: { slug: c.slug },
      // Re-running seed on a deployment that already ran the old version
      // (shared placeholder poster + one external YouTube video for every
      // title) needs to actually clear that placeholder, not just leave it
      // — otherwise the poster override permanently wins over the real
      // generated thumbnail even after the video asset below is upgraded.
      update: { posterUrl: null, bannerUrl: null, countryCode: c.countryCode },
      create: {
        channelId: c.channelId,
        createdByUserId: owner,
        title: c.title,
        slug: c.slug,
        synopsis: c.synopsis,
        contentType: c.type,
        categoryId: categories[c.category].id,
        originalLanguageId: languages["ms-MY"].id,
        rating: "U",
        releaseYear: 2025,
        countryCode: c.countryCode,
        // No posterUrl/bannerUrl override — left null so every page that
        // renders this title falls back to the real thumbnail generated
        // from its own video (see resolveCardMedia), instead of every
        // seeded title sharing one static placeholder image.
        visibility: "PUBLIC",
        status: "PUBLISHED",
        publishedAt: new Date(),
        ownsContent: true,
        authorisedToPublish: true,
        isAiGenerated: c.type === "AI_PRODUCTION",
        genres: { create: c.genres.map((g) => ({ genreId: genres[g].id })) },
      },
    });

    const existingAsset = await prisma.videoAsset.findFirst({ where: { contentId: content.id } });
    // A real PLATFORM asset (from this version of the seed, or a genuine
    // creator upload attached to seed content) is left untouched — only
    // upgrade the old placeholder pattern (every title sharing one
    // EXTERNAL/YouTube asset) so re-seeding an already-deployed instance
    // actually replaces it instead of leaving it stuck forever.
    if (!existingAsset || existingAsset.sourceType === "EXTERNAL") {
      if (existingAsset) await prisma.videoAsset.delete({ where: { id: existingAsset.id } });
      console.log(`  transcoding ${c.videoFile} for "${c.title}"…`);
      const durationSeconds = await ingestSeedVideo(content.id, c.videoFile);
      await prisma.content.update({ where: { id: content.id }, data: { durationSeconds } });
    }
  }

  // --- Homepage sections (Section 5/25) -----------------------------------------
  const sectionSeeds: { key: string; title: string; algorithm: HomepageAlgorithm; sortOrder: number; filterJson?: Prisma.InputJsonValue }[] = [
    { key: "trending", title: "Trending", algorithm: "TRENDING", sortOrder: 1 },
    { key: "new-releases", title: "New Releases", algorithm: "NEWEST", sortOrder: 2 },
    { key: "continue-watching", title: "Continue Watching", algorithm: "CONTINUE_WATCHING", sortOrder: 3 },
    { key: "recommended", title: "Recommended For You", algorithm: "RECOMMENDED", sortOrder: 4 },
    { key: "malaysian-stories", title: "Malaysian Stories", algorithm: "BY_CATEGORY", sortOrder: 5, filterJson: { categoryKey: "malaysian-stories" } },
    { key: "drama-row", title: "Drama", algorithm: "BY_CATEGORY", sortOrder: 6, filterJson: { categoryKey: "drama" } },
    { key: "documentary-row", title: "Documentary", algorithm: "BY_CATEGORY", sortOrder: 7, filterJson: { categoryKey: "documentary" } },
    { key: "short-films-row", title: "Short Films", algorithm: "BY_CATEGORY", sortOrder: 8, filterJson: { categoryKey: "short-films" } },
    { key: "ai-productions-row", title: "AI Productions", algorithm: "BY_CATEGORY", sortOrder: 9, filterJson: { categoryKey: "ai-productions" } },
    { key: "government-community-row", title: "Government & Community", algorithm: "BY_CATEGORY", sortOrder: 10, filterJson: { categoryKey: "government-community" } },
    { key: "culture-heritage-row", title: "Culture & Heritage", algorithm: "BY_CATEGORY", sortOrder: 11, filterJson: { categoryKey: "culture-heritage" } },
    { key: "education-row", title: "Education", algorithm: "BY_CATEGORY", sortOrder: 12, filterJson: { categoryKey: "education" } },
    { key: "live-now", title: "Live Now", algorithm: "LIVE_NOW", sortOrder: 13 },
    { key: "channels-you-follow", title: "Channels You Follow", algorithm: "FOLLOWED_CHANNELS", sortOrder: 14 },
  ];
  for (const s of sectionSeeds) {
    await prisma.homepageSection.upsert({
      where: { key: s.key },
      update: {},
      create: { key: s.key, title: s.title, algorithm: s.algorithm, sortOrder: s.sortOrder, filterJson: s.filterJson },
    });
  }

  // Hero: feature "Jejak Melaka"
  const jejakMelaka = await prisma.content.findUnique({ where: { slug: "jejak-melaka" } });
  if (jejakMelaka) {
    const hero = await prisma.homepageSection.upsert({
      where: { key: "hero" },
      update: {},
      create: { key: "hero", title: "Hero", algorithm: "MANUAL", sortOrder: -1, isVisible: false },
    });
    await prisma.homepageSectionItem.upsert({
      where: { sectionId_contentId: { sectionId: hero.id, contentId: jejakMelaka.id } },
      update: {},
      create: { sectionId: hero.id, contentId: jejakMelaka.id, position: 0 },
    });
  }

  // --- Ticker (Section 8) ----------------------------------------------------------
  const existingTicker = await prisma.ticker.findFirst({ where: { message: "NEW: Jejak Melaka now streaming" } });
  if (!existingTicker) {
    await prisma.ticker.create({ data: { message: "NEW: Jejak Melaka now streaming", destinationContentId: jejakMelaka?.id, priority: 10, isEnabled: true } });
  }

  // --- Subscription plans (Section 37, inactive until billing is enabled) ----------
  const planSeeds = [
    { key: "free", name: "Free", tier: "FREE" as const, priceCents: 0, billingPeriod: null },
    { key: "basic-monthly", name: "Basic", tier: "BASIC" as const, priceCents: 999, billingPeriod: "MONTHLY" },
    { key: "premium-monthly", name: "Premium", tier: "PREMIUM" as const, priceCents: 1999, billingPeriod: "MONTHLY" },
    { key: "creator-pro", name: "Creator Pro", tier: "CREATOR" as const, priceCents: 2999, billingPeriod: "MONTHLY" },
    { key: "organisation", name: "Organisation", tier: "ORGANISATION" as const, priceCents: 0, billingPeriod: "ANNUAL" },
  ];
  for (const p of planSeeds) {
    await prisma.subscriptionPlan.upsert({ where: { key: p.key }, update: {}, create: { ...p, isActive: false } });
  }

  console.log("Seed complete. Demo accounts (password: Password123!):");
  console.log("  Admin:   admin@lokal.my");
  console.log("  Creator: siti@lokal.my / borneo.stories@lokal.my");
  console.log("  Viewer:  viewer@lokal.my");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
