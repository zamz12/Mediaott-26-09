import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type {
  CreateUploadSessionInput,
  CreateUploadSessionResult,
  StorageBucketName,
  StorageProvider,
} from "./storage.provider";

// Local-filesystem implementation used only when no S3-compatible endpoint is
// configured (e.g. this sandbox, where neither AWS nor a MinIO container is
// reachable). "Signed URLs" are HMAC-signed local API routes with an expiry,
// verified in src/app/api/storage/[bucket]/[...key]/route.ts — this keeps the
// "no permanent public URLs" contract even without real object storage.
const ROOT = path.join(process.cwd(), ".data", "storage");
const SECRET = process.env.AUTH_SECRET ?? "dev-only-insecure-secret";

function sign(bucket: string, key: string, expires: number) {
  return crypto.createHmac("sha256", SECRET).update(`${bucket}:${key}:${expires}`).digest("hex");
}

export function verifyLocalStorageSignature(bucket: string, key: string, expires: number, signature: string) {
  if (Date.now() > expires) return false;
  const expected = sign(bucket, key, expires);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ""));
}

export class LocalFsStorageProvider implements StorageProvider {
  private filePath(bucket: StorageBucketName, key: string) {
    return path.join(ROOT, bucket, key);
  }

  async createUploadSession(input: CreateUploadSessionInput): Promise<CreateUploadSessionResult> {
    const ttl = Number(process.env.STORAGE_SIGNED_URL_TTL_SECONDS ?? 300);
    const expires = Date.now() + ttl * 1000;
    const signature = sign(input.bucket, input.key, expires);
    const uploadUrl = `/api/storage/${input.bucket}/${encodeURIComponent(input.key)}?expires=${expires}&signature=${signature}`;
    return { uploadUrl, method: "PUT", expiresAt: new Date(expires) };
  }

  async completeUpload(bucket: StorageBucketName, key: string) {
    const stat = await fs.stat(this.filePath(bucket, key));
    return { sizeBytes: stat.size };
  }

  async getSignedReadUrl(bucket: StorageBucketName, key: string, ttlSeconds?: number) {
    const ttl = ttlSeconds ?? Number(process.env.STORAGE_SIGNED_URL_TTL_SECONDS ?? 300);
    const expires = Date.now() + ttl * 1000;
    const signature = sign(bucket, key, expires);
    return `/api/storage/${bucket}/${encodeURIComponent(key)}?expires=${expires}&signature=${signature}`;
  }

  async putObject(bucket: StorageBucketName, key: string, body: Buffer | string, _contentType?: string) {
    const filePath = this.filePath(bucket, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
  }

  async getObject(bucket: StorageBucketName, key: string): Promise<Buffer> {
    return fs.readFile(this.filePath(bucket, key));
  }

  async deleteAsset(bucket: StorageBucketName, key: string) {
    await fs.rm(this.filePath(bucket, key), { force: true });
  }

  async getStorageUsage(prefix: string) {
    const base = path.join(ROOT, "vault", prefix);
    let totalBytes = 0;
    async function walk(dir: string) {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else totalBytes += (await fs.stat(full)).size;
      }
    }
    await walk(base);
    return { totalBytes };
  }
}
