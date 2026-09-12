import { Queue } from "bullmq";
import IORedis from "ioredis";

// Single shared Redis connection + named queues for the background workers
// (Section 13/35). Route handlers only ever enqueue — actual transcode/
// transcription work happens in src/workers/*, run as a separate process.
let connection: IORedis | undefined;
function getConnection() {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
  }
  return connection;
}

export interface TranscodeJobData {
  transcodeJobId: string;
  videoAssetId: string;
  masterBucket: string;
  masterKey: string;
}

export interface TranscriptJobData {
  transcriptJobId: string;
  videoAssetId: string;
}

let transcodeQueue: Queue<TranscodeJobData> | undefined;
export function getTranscodeQueue() {
  if (!transcodeQueue) transcodeQueue = new Queue<TranscodeJobData>("transcode", { connection: getConnection() });
  return transcodeQueue;
}

let transcriptQueue: Queue<TranscriptJobData> | undefined;
export function getTranscriptQueue() {
  if (!transcriptQueue) transcriptQueue = new Queue<TranscriptJobData>("transcript", { connection: getConnection() });
  return transcriptQueue;
}

export { getConnection as getRedisConnection };
