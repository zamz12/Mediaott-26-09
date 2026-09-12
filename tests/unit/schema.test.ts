import { describe, expect, it } from "vitest";
import { registerSchema } from "@/modules/auth/schema";
import { contentMetadataSchema } from "@/modules/media/schema";

describe("registerSchema", () => {
  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({
      email: "viewer@example.com",
      password: "Password123!",
      displayName: "Test Viewer",
      handle: "test_viewer",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a weak password", () => {
    const result = registerSchema.safeParse({
      email: "viewer@example.com",
      password: "short",
      displayName: "Test Viewer",
      handle: "test_viewer",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid handle", () => {
    const result = registerSchema.safeParse({
      email: "viewer@example.com",
      password: "Password123!",
      displayName: "Test Viewer",
      handle: "Not A Valid Handle!",
    });
    expect(result.success).toBe(false);
  });
});

describe("contentMetadataSchema", () => {
  it("accepts a minimal valid content metadata payload", () => {
    const result = contentMetadataSchema.safeParse({
      title: "Jejak Melaka",
      contentType: "DOCUMENTARY",
      rating: "U",
      visibility: "PUBLIC",
      ownsContent: "on",
      authorisedToPublish: "on",
      isAiGenerated: undefined,
      containsPaidPromotion: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown content type", () => {
    const result = contentMetadataSchema.safeParse({
      title: "Bad Content",
      contentType: "NOT_A_REAL_TYPE",
      rating: "U",
      visibility: "PUBLIC",
      ownsContent: true,
      authorisedToPublish: true,
    });
    expect(result.success).toBe(false);
  });
});
