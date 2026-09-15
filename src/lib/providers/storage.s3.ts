import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  CreateUploadSessionInput,
  CreateUploadSessionResult,
  StorageBucketName,
  StorageProvider,
} from "./storage.provider";

// S3-compatible implementation. Points at AWS S3 in ap-southeast-5 (Malaysia)
// in production, or MinIO locally when STORAGE_ENDPOINT is set.
export class S3StorageProvider implements StorageProvider {
  // Server-side operations (putObject, getObject, HeadObject for
  // completeUpload) run inside the Docker network and use STORAGE_ENDPOINT
  // (e.g. http://minio:9000, only resolvable by other containers).
  private client: S3Client;
  // Signed URLs handed to the *browser* (direct upload PUT, HLS/thumbnail/
  // subtitle playback) must instead be signed against a host the browser can
  // actually reach — STORAGE_PUBLIC_ENDPOINT (e.g. http://localhost:9000).
  // Reusing the internal endpoint here was the bug: the signature covers the
  // Host header, so the URL can't just be string-replaced after signing —
  // it has to be signed with the public endpoint's client from the start.
  private publicClient: S3Client;
  private buckets: Record<StorageBucketName, string>;
  private defaultTtl: number;

  constructor() {
    const region = process.env.STORAGE_REGION ?? "ap-southeast-5";
    const forcePathStyle = process.env.STORAGE_FORCE_PATH_STYLE === "true";
    const credentials = {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "",
    };

    this.client = new S3Client({
      region,
      endpoint: process.env.STORAGE_ENDPOINT || undefined,
      forcePathStyle,
      credentials,
    });

    const publicEndpoint = process.env.STORAGE_PUBLIC_ENDPOINT || process.env.STORAGE_ENDPOINT || undefined;
    this.publicClient =
      publicEndpoint === (process.env.STORAGE_ENDPOINT || undefined)
        ? this.client
        : new S3Client({ region, endpoint: publicEndpoint, forcePathStyle, credentials });

    this.buckets = {
      masters: process.env.STORAGE_BUCKET_MASTERS ?? "lokal-masters",
      transcoded: process.env.STORAGE_BUCKET_TRANSCODED ?? "lokal-transcoded",
      previews: process.env.STORAGE_BUCKET_PREVIEWS ?? "lokal-previews",
      thumbnails: process.env.STORAGE_BUCKET_THUMBNAILS ?? "lokal-thumbnails",
      subtitles: process.env.STORAGE_BUCKET_SUBTITLES ?? "lokal-subtitles",
      vault: process.env.STORAGE_BUCKET_VAULT ?? "lokal-private-vault",
      temporary: process.env.STORAGE_BUCKET_TEMP ?? "lokal-temporary",
    };

    this.defaultTtl = Number(process.env.STORAGE_SIGNED_URL_TTL_SECONDS ?? 300);
  }

  async createUploadSession(input: CreateUploadSessionInput): Promise<CreateUploadSessionResult> {
    const bucket = this.buckets[input.bucket];
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      ContentType: input.contentType,
    });
    const uploadUrl = await getSignedUrl(this.publicClient, command, { expiresIn: this.defaultTtl });

    return {
      uploadUrl,
      method: "PUT",
      expiresAt: new Date(Date.now() + this.defaultTtl * 1000),
    };
  }

  async completeUpload(bucket: StorageBucketName, key: string) {
    const head = await this.client.send(
      new HeadObjectCommand({ Bucket: this.buckets[bucket], Key: key }),
    );
    return { sizeBytes: head.ContentLength ?? 0 };
  }

  async getSignedReadUrl(bucket: StorageBucketName, key: string, ttlSeconds?: number) {
    const command = new GetObjectCommand({ Bucket: this.buckets[bucket], Key: key });
    return getSignedUrl(this.publicClient, command, { expiresIn: ttlSeconds ?? this.defaultTtl });
  }

  async putObject(bucket: StorageBucketName, key: string, body: Buffer | string, contentType: string) {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.buckets[bucket], Key: key, Body: body, ContentType: contentType }),
    );
  }

  async getObject(bucket: StorageBucketName, key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.buckets[bucket], Key: key }));
    const bytes = await res.Body?.transformToByteArray();
    return Buffer.from(bytes ?? []);
  }

  async deleteAsset(bucket: StorageBucketName, key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.buckets[bucket], Key: key }));
  }

  async getStorageUsage(prefix: string) {
    let totalBytes = 0;
    let continuationToken: string | undefined;
    do {
      const res = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.buckets.vault,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      totalBytes += (res.Contents ?? []).reduce((sum, obj) => sum + (obj.Size ?? 0), 0);
      continuationToken = res.NextContinuationToken;
    } while (continuationToken);

    return { totalBytes };
  }
}
