import { afterAll, describe, expect, it } from "vitest";
import * as argon2 from "argon2";
import { prisma } from "@/lib/prisma";
import { registerViewer } from "@/modules/auth/service";
import { getHomepageSections } from "@/modules/catalogue/service";
import { getSearchProvider } from "@/lib/providers";
import { upsertWatchProgress, getWatchProgress } from "@/modules/library/service";
import { subscribeToChannel, unsubscribeFromChannel, getSubscription } from "@/modules/channels/service";
import { createChannel, createDraftContent, attachExternalVideoAsset, submitContentForReview } from "@/modules/media/service";
import { decideModerationCase, listModerationQueue } from "@/modules/moderation/service";

// Integration tests run against the local dev PostgreSQL instance (see
// .env / docker-compose.yml). Every fixture is namespaced with a unique
// run id and cleaned up in afterAll so repeated runs don't collide.
const RUN_ID = Date.now();
const createdUserIds: string[] = [];
const createdChannelIds: string[] = [];
const createdContentIds: string[] = [];

afterAll(async () => {
  for (const contentId of createdContentIds) {
    await prisma.moderationCase.deleteMany({ where: { contentId } });
    await prisma.videoAsset.deleteMany({ where: { contentId } });
    await prisma.watchProgress.deleteMany({ where: { contentId } });
    await prisma.content.deleteMany({ where: { id: contentId } });
  }
  for (const channelId of createdChannelIds) {
    await prisma.channelSubscription.deleteMany({ where: { channelId } });
    await prisma.channel.deleteMany({ where: { id: channelId } });
  }
  for (const userId of createdUserIds) {
    await prisma.storageQuota.deleteMany({ where: { userId } });
    await prisma.profile.deleteMany({ where: { userId } });
    await prisma.userRole.deleteMany({ where: { userId } });
    await prisma.consentRecord.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("registration and login (Section 43)", () => {
  it("registers a viewer with the VIEWER role, a profile, and a storage quota", async () => {
    const user = await registerViewer({
      email: `viewer-${RUN_ID}@lokal.test`,
      password: "Password123!",
      displayName: "Integration Viewer",
      handle: `int_viewer_${RUN_ID}`,
    });
    createdUserIds.push(user.id);

    const full = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { userRoles: { include: { role: true } }, profile: true, storageQuota: true },
    });

    expect(full.userRoles.map((r) => r.role.name)).toContain("VIEWER");
    expect(full.profile).not.toBeNull();
    expect(full.storageQuota).not.toBeNull();
  });

  it("verifies the stored password hash matches what login checks (Argon2id, Section 31)", async () => {
    const user = await prisma.user.findFirstOrThrow({ where: { email: `viewer-${RUN_ID}@lokal.test` } });
    const valid = await argon2.verify(user.passwordHash!, "Password123!");
    const invalid = await argon2.verify(user.passwordHash!, "wrong-password");
    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });
});

describe("browse and search", () => {
  it("returns non-empty homepage sections from seed data", async () => {
    const sections = await getHomepageSections();
    expect(sections.length).toBeGreaterThan(0);
  });

  it("finds seeded demo content by title", async () => {
    const results = await getSearchProvider().search({ text: "Melaka" });
    expect(results.some((r) => r.slug === "jejak-melaka")).toBe(true);
  });
});

describe("watch progress", () => {
  it("upserts a single row per (user, content) and marks completion at the threshold", async () => {
    const user = await prisma.user.findFirstOrThrow({ where: { email: `viewer-${RUN_ID}@lokal.test` } });
    const content = await prisma.content.findFirstOrThrow({ where: { slug: "jejak-melaka" } });

    await upsertWatchProgress(user.id, content.id, 100, 600);
    let progress = await getWatchProgress(user.id, content.id);
    expect(progress?.positionSeconds).toBe(100);
    expect(progress?.completed).toBe(false);

    // Debounced client re-reports at >90% — same row updates, no duplicate.
    await upsertWatchProgress(user.id, content.id, 570, 600);
    progress = await getWatchProgress(user.id, content.id);
    expect(progress?.positionSeconds).toBe(570);
    expect(progress?.completed).toBe(true);

    const rowCount = await prisma.watchProgress.count({ where: { userId: user.id, contentId: content.id } });
    expect(rowCount).toBe(1);
  });
});

describe("channel subscription", () => {
  it("follows and unfollows a channel", async () => {
    const user = await prisma.user.findFirstOrThrow({ where: { email: `viewer-${RUN_ID}@lokal.test` } });
    const channel = await prisma.channel.findFirstOrThrow({ where: { slug: "warisan-negara" } });

    await subscribeToChannel(user.id, channel.id);
    expect(await getSubscription(user.id, channel.id)).not.toBeNull();

    await unsubscribeFromChannel(user.id, channel.id);
    expect(await getSubscription(user.id, channel.id)).toBeNull();
  });
});

describe("creator upload -> moderation -> admin approval (Section 22/43)", () => {
  it("takes a draft through submission, the moderation queue, and publication", async () => {
    const creator = await prisma.user.findFirstOrThrow({ where: { email: "siti@lokal.my" } });
    const admin = await prisma.user.findFirstOrThrow({ where: { email: "admin@lokal.my" } });

    const channel = await createChannel(creator.id, `Integration Test Channel ${RUN_ID}`);
    createdChannelIds.push(channel.id);

    const content = await createDraftContent(creator.id, channel.id, `Integration Test Video ${RUN_ID}`);
    createdContentIds.push(content.id);
    expect(content.status).toBe("DRAFT");

    await attachExternalVideoAsset(content.id, "YOUTUBE", "aqz-KE-bpKQ");
    await prisma.content.update({ where: { id: content.id }, data: { ownsContent: true, authorisedToPublish: true } });

    const submitted = await submitContentForReview(content.id);
    expect(submitted.status).toBe("UNDER_REVIEW");

    const queue = await listModerationQueue();
    const moderationCase = queue.find((c) => c.contentId === content.id);
    expect(moderationCase).toBeDefined();

    await decideModerationCase({ moderationCaseId: moderationCase!.id, decision: "APPROVED", adminId: admin.id });

    const finalContent = await prisma.content.findUniqueOrThrow({ where: { id: content.id } });
    expect(finalContent.status).toBe("PUBLISHED");
    expect(finalContent.visibility).toBe("PUBLIC");
  });
});
