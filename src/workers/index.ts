import { startTranscodeWorker } from "./transcode.worker";
import { startTranscriptWorker } from "./transcript.worker";

// Entry point for the background worker process: `pnpm worker`.
// Runs separately from the Next.js server (Section 13/35) — never invoked
// from a request handler.
const transcodeWorker = startTranscodeWorker();
const transcriptWorker = startTranscriptWorker();

console.log("LOKAL workers started: transcode, transcript");

process.on("SIGTERM", async () => {
  await Promise.all([transcodeWorker.close(), transcriptWorker.close()]);
  process.exit(0);
});
