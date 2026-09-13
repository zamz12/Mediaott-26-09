import { NextRequest, NextResponse } from "next/server";

// Sets a short-lived, non-identifying confirmation cookie once a viewer
// clicks through the 18+ interstitial (Section 22). This is a click-through
// gate, not identity verification — LOKAL doesn't collect date-of-birth at
// registration, matching the scope of an MVP rather than a KYC system.
const AGE_GATE_COOKIE = "lokal_age_confirmed";
const MAX_AGE_SECONDS = 60 * 60 * 12; // re-confirm every 12 hours

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const requested = (formData.get("redirectTo") as string) || "/";
  // Only ever redirect to a same-site relative path — never let this become
  // an open redirect via an absolute or protocol-relative URL.
  const redirectTo = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  const response = NextResponse.redirect(new URL(redirectTo, req.url));
  response.cookies.set(AGE_GATE_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}
