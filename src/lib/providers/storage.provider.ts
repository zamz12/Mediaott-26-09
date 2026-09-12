// StorageProvider — the only interface the rest of the app is allowed to use
// for reading/writing media. Swapping AWS S3 for another Malaysian vendor, or
// running fully local in dev, means implementing this interface once.
// See Section 15/16/36 of the product spec.

export type StorageBucketName =
  | "masters"
  | "transcoded"
  | "previews"
  | "thumbnails"
  | "subtitles"
  | "vault"
  | "temporary";

export interface CreateUploadSessionInput {
  bucket: StorageBucketName;
  key: string;
  contentType: string;
  maxSizeBytes?: number;
}

export interface CreateUploadSessionResult {
  /** URL the browser PUTs/POSTs directly to — never proxied through the app server. */
  uploadUrl: string;
  /** Extra fields/headers the client must send with the upload (provider-specific). */
  fields?: Record<string, string>;
  method: "PUT" | "POST";
  expiresAt: Date;
}

export interface StorageProvider {
  /** Creates a direct-to-storage signed upload session (Section 13). */
  createUploadSession(input: CreateUploadSessionInput): Promise<CreateUploadSessionResult>;

  /** Confirms an upload completed and returns its actual size, if known. */
  completeUpload(bucket: StorageBucketName, key: string): Promise<{ sizeBytes: number }>;

  /** Short-lived signed URL for reading a private object (Section 15/17). */
  getSignedReadUrl(bucket: StorageBucketName, key: string, ttlSeconds?: number): Promise<string>;

  /** Writes a small object directly server-side (e.g. generated manifests). */
  putObject(bucket: StorageBucketName, key: string, body: Buffer | string, contentType: string): Promise<void>;

  getObject(bucket: StorageBucketName, key: string): Promise<Buffer>;

  deleteAsset(bucket: StorageBucketName, key: string): Promise<void>;

  /** Aggregate usage for quota tracking (Section 16). */
  getStorageUsage(prefix: string): Promise<{ totalBytes: number }>;
}
