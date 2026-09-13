// Creates the private storage buckets StorageProvider expects (Section 15)
// against a MinIO (or any S3-compatible) endpoint. Run once before the app
// starts — see the `minio-init` service in docker-compose.yml. Uses the
// project's own @aws-sdk/client-s3 dependency instead of pulling a separate
// `minio/mc` image, which has become unreliable on Docker Hub since MinIO's
// licensing changes.
import { S3Client, CreateBucketCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: process.env.STORAGE_REGION ?? "ap-southeast-5",
  endpoint: process.env.STORAGE_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "",
  },
});

const buckets = [
  process.env.STORAGE_BUCKET_MASTERS,
  process.env.STORAGE_BUCKET_TRANSCODED,
  process.env.STORAGE_BUCKET_PREVIEWS,
  process.env.STORAGE_BUCKET_THUMBNAILS,
  process.env.STORAGE_BUCKET_SUBTITLES,
  process.env.STORAGE_BUCKET_VAULT,
  process.env.STORAGE_BUCKET_TEMP,
].filter(Boolean);

for (const bucket of buckets) {
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`created bucket: ${bucket}`);
  } catch (err) {
    if (err.name === "BucketAlreadyOwnedByYou" || err.name === "BucketAlreadyExists") {
      console.log(`bucket already exists: ${bucket}`);
    } else {
      console.error(`failed to create bucket ${bucket}:`, err.message);
      process.exit(1);
    }
  }
}

console.log("buckets ready");
