import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { registerSchema, type RegisterInput } from "./schema";

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("An account with this email already exists.");
  }
}

export class HandleTakenError extends Error {
  constructor() {
    super("This handle is already taken.");
  }
}

// Registers a viewer account: default role VIEWER, tier FREE, a Profile, and
// a StorageQuota row so the personal vault (Section 16) works immediately.
export async function registerViewer(input: RegisterInput) {
  const data = registerSchema.parse(input);

  const [existingEmail, existingHandle] = await Promise.all([
    prisma.user.findUnique({ where: { email: data.email.toLowerCase() } }),
    prisma.user.findUnique({ where: { handle: data.handle.toLowerCase() } }),
  ]);
  if (existingEmail) throw new EmailAlreadyRegisteredError();
  if (existingHandle) throw new HandleTakenError();

  const passwordHash = await hashPassword(data.password);
  const viewerRole = await prisma.role.findUnique({ where: { name: "VIEWER" } });
  if (!viewerRole) throw new Error("VIEWER role is not seeded — run the seed script.");

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      handle: data.handle.toLowerCase(),
      displayName: data.displayName,
      passwordHash,
      subscriptionTier: "FREE",
      userRoles: { create: { roleId: viewerRole.id } },
      profile: { create: {} },
      storageQuota: { create: {} },
    },
  });

  await prisma.consentRecord.create({
    data: { userId: user.id, policy: "terms-of-service-v1", granted: true },
  });

  return user;
}
