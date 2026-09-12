import { NextRequest, NextResponse } from "next/server";
import { LocalFsStorageProvider, verifyLocalStorageSignature } from "@/lib/providers/storage.local";
import type { StorageBucketName } from "@/lib/providers/storage.provider";

// Dev-only stand-in for a real object storage endpoint (S3/MinIO). Only used
// when LocalFsStorageProvider is active (no STORAGE_ENDPOINT configured) —
// see src/lib/providers/storage.local.ts for why this exists.
const provider = new LocalFsStorageProvider();

function checkSignature(req: NextRequest, bucket: string, key: string) {
  const expires = Number(req.nextUrl.searchParams.get("expires"));
  const signature = req.nextUrl.searchParams.get("signature") ?? "";
  return verifyLocalStorageSignature(bucket, key, expires, signature);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ bucket: string; key: string[] }> }) {
  const { bucket, key } = await params;
  const fullKey = decodeURIComponent(key.join("/"));

  if (!checkSignature(req, bucket, fullKey)) {
    return NextResponse.json({ error: "Invalid or expired upload URL" }, { status: 403 });
  }

  const body = Buffer.from(await req.arrayBuffer());
  await provider.putObject(bucket as StorageBucketName, fullKey, body, req.headers.get("content-type") ?? "application/octet-stream");
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ bucket: string; key: string[] }> }) {
  const { bucket, key } = await params;
  const fullKey = decodeURIComponent(key.join("/"));

  if (!checkSignature(req, bucket, fullKey)) {
    return NextResponse.json({ error: "Invalid or expired URL" }, { status: 403 });
  }

  try {
    const buffer = await provider.getObject(bucket as StorageBucketName, fullKey);
    return new NextResponse(new Uint8Array(buffer));
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
