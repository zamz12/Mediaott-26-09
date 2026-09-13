import type { Visibility } from "@prisma/client";

// Visibility values that make content discoverable in browse/search/homepage
// contexts. PUBLIC_18_PLUS is listed like any public title — the age check
// happens at playback time (src/modules/streaming/service.ts), not at
// browse time, matching how mainstream platforms age-gate a watch page
// rather than hiding the title from search entirely.
export const PUBLIC_VISIBILITIES: Visibility[] = ["PUBLIC", "PUBLIC_18_PLUS"];

export const PUBLIC_VISIBILITY_FILTER = { in: PUBLIC_VISIBILITIES };

export function isPublicVisibility(visibility: Visibility): boolean {
  return (PUBLIC_VISIBILITIES as string[]).includes(visibility);
}

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  PUBLIC: "Public",
  UNLISTED: "Unlisted",
  PRIVATE: "Private",
  MEMBERS_ONLY: "Members Only (paid tier)",
  ORGANISATION_ONLY: "Organisation Only",
  SCHEDULED: "Scheduled",
  SUBSCRIBERS_ONLY: "Subscribers Only",
  PUBLIC_18_PLUS: "Public (18+ only)",
  REGULATORY_HOLD: "Regulatory Hold (Private)",
};
