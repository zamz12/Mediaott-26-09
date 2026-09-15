import { prisma } from "@/lib/prisma";

export async function becomeCreator(userId: string) {
  const creatorRole = await prisma.role.findUnique({ where: { name: "CREATOR" } });
  if (!creatorRole) throw new Error("CREATOR role is not seeded — run the seed script.");

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: creatorRole.id } },
    update: {},
    create: { userId, roleId: creatorRole.id },
  });

  await prisma.user.update({ where: { id: userId }, data: { subscriptionTier: "CREATOR" } });
}

const VALID_PALETTES = ["cyan", "violet", "rose", "emerald", "amber"];
const VALID_SCALES = ["COMPACT", "COMFORTABLE", "LARGE"];

// Read server-side (root layout) so the chosen palette/size render on first
// paint — no flash of the default before client JS applies it, unlike the
// dark/light theme toggle which is localStorage-only. Logged-out visitors
// just get the defaults; personalization is an account feature.
export async function getAppearancePrefs(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { palette: true, uiScale: true } });
  return { palette: profile?.palette ?? "cyan", uiScale: profile?.uiScale ?? "COMFORTABLE" };
}

export async function updateAppearance(userId: string, data: { palette?: string; uiScale?: string }) {
  if (data.palette && !VALID_PALETTES.includes(data.palette)) throw new Error("Unknown palette.");
  if (data.uiScale && !VALID_SCALES.includes(data.uiScale)) throw new Error("Unknown size.");
  await prisma.profile.upsert({ where: { userId }, update: data, create: { userId, ...data } });
}

export async function getAccountOverview(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      profile: { include: { preferredLanguage: true, interests: { include: { genre: true } } } },
      userRoles: { include: { role: true } },
      channels: true,
      storageQuota: true,
      deviceSessions: { where: { revokedAt: null }, orderBy: { lastActiveAt: "desc" } },
      userSubscriptions: { include: { plan: true }, where: { status: "ACTIVE" } },
    },
  });
}
