import { prisma } from "@/lib/prisma";

export interface Branding {
  name: string;
  tagline: string;
}

const DEFAULTS: Branding = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "LOKAL",
  tagline: "Malaysian stories, streaming free.",
};

// Admin can override brand name/tagline at runtime via SystemConfig — no
// deployment required (Section 28). Falls back to env/hardcoded defaults so
// the app works before any admin has touched configuration.
export async function getBranding(): Promise<Branding> {
  const rows = await prisma.systemConfig.findMany({
    where: { key: { in: ["brand.name", "brand.tagline"] } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value as string]));
  return {
    name: map.get("brand.name") ?? DEFAULTS.name,
    tagline: map.get("brand.tagline") ?? DEFAULTS.tagline,
  };
}
