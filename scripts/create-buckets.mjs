// Creates the private storage buckets StorageProvider expects (Section 15)
// against a MinIO (or any S3-compatible) endpoint. Run once before the app
// starts — see the `minio-init` service in docker-compose.yml. Uses the
// project's own @aws-sdk/client-s3 dependency instead of pulling a separate
// `minio/mc` image, which has become unreliable on Docker Hub since MinIO's
// licensing changes.
import { S3Client, CreateBucketCommand, PutBucketPolicyCommand } from "@aws-sdk/client-s3";

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

// HLS is inherently multi-file (master playlist -> per-quality playlists ->
// many segment files), each referencing the next by a bare relative
// filename. A presigned URL's signature is tied to that one file's exact
// path+query, and resolving a relative reference against it drops the query
// string entirely per the URL spec — so every sub-request MinIO receives
// for a rendition playlist or segment arrives unsigned and gets rejected,
// even though the master manifest itself loaded fine. Playback authorization
// (visibility/age/subscription checks) already happens server-side before
// any URL is ever handed to a client, and object keys are unguessable ULIDs,
// so making just this one bucket public-read is the standard, low-risk fix
// for local/self-hosted HLS — production on AWS should front this bucket
// with CloudFront signed cookies instead of relying on object-level ACLs.
const transcodedBucket = process.env.STORAGE_BUCKET_TRANSCODED;
if (transcodedBucket) {
  const policy = {
    Version: "2012-10-17",
    Statement: [{ Effect: "Allow", Principal: "*", Action: ["s3:GetObject"], Resource: [`arn:aws:s3:::${transcodedBucket}/*`] }],
  };
  await client.send(new PutBucketPolicyCommand({ Bucket: transcodedBucket, Policy: JSON.stringify(policy) }));
  console.log(`set public-read policy on: ${transcodedBucket}`);
}

console.log("buckets ready");
