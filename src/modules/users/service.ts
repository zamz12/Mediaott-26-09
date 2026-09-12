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
