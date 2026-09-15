import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { getStorageProvider } from "./index";
import type { TranscodeInput, TranscodeProvider, TranscodeResult, TranscodeRendition } from "./transcode.provider";

// Full ladder from 4K down to mobile-friendly SD. Which rungs actually get
// encoded for a given upload is decided at runtime from the source's own
// height (see selectRenditionLadder) — never upscaled past what the creator
// actually uploaded, and 4K only when the source genuinely is 4K.
const FULL_RENDITION_LADDER: { name: TranscodeRendition["resolution"]; height: number; bitrateKbps: number }[] = [
  { name: "2160p", height: 2160, bitrateKbps: 14000 },
  { name: "1080p", height: 1080, bitrateKbps: 5000 },
  { name: "720p", height: 720, bitrateKbps: 2800 },
  { name: "480p", height: 480, bitrateKbps: 1400 },
  { name: "360p", height: 360, bitrateKbps: 800 },
];

// Only encode rungs the source can actually fill (no upscaling to a fake
// "1080p"/"4K"), but always keep at least one rung even for a very small
// source clip.
function selectRenditionLadder(sourceHeight: number) {
  const fitting = FULL_RENDITION_LADDER.filter((rung) => rung.height <= sourceHeight);
  return fitting.length > 0 ? fitting : [FULL_RENDITION_LADDER[FULL_RENDITION_LADDER.length - 1]];
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-500)}`))));
  });
}

function runCapture(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve(stdout) : reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-500)}`))));
  });
}

// Auto-calculated duration (Section 9/23) — never creator-entered.
async function probeDurationSeconds(filePath: string): Promise<number> {
  const stdout = await runCapture("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  const seconds = Number.parseFloat(stdout.trim());
  return Number.isFinite(seconds) ? Math.round(seconds) : 0;
}

// Source frame height decides which quality rungs are worth encoding (see
// selectRenditionLadder). Uses the literal height ffprobe reports — for a
// portrait/mobile upload that's already the taller (vertical) dimension, so
// this reads correctly for both orientations without special-casing either.
async function probeVideoHeight(filePath: string): Promise<number> {
  const stdout = await runCapture("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=height",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  const height = Number.parseInt(stdout.trim(), 10);
  return Number.isFinite(height) && height > 0 ? height : 1080;
}

// Shells out to a locally installed ffmpeg/ffprobe. Requires those binaries
// on PATH — production should use AwsMediaConvertProvider instead, which has
// no host dependency.
export class LocalFfmpegTranscodeProvider implements TranscodeProvider {
  async transcode(input: TranscodeInput): Promise<TranscodeResult> {
    const storage = getStorageProvider();
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "lokal-transcode-"));
    const masterPath = path.join(workDir, "master.mp4");

    const masterBuffer = await storage.getObject(input.masterBucket as "masters", input.masterKey);
    await fs.writeFile(masterPath, masterBuffer);

    const [durationSeconds, sourceHeight] = await Promise.all([
      probeDurationSeconds(masterPath),
      probeVideoHeight(masterPath),
    ]);
    const ladder = selectRenditionLadder(sourceHeight);

    const renditions: TranscodeRendition[] = [];
    for (const rung of ladder) {
      const outPath = path.join(workDir, `${rung.name}.m3u8`);
      await run("ffmpeg", [
        "-y",
        "-i",
        masterPath,
        "-vf",
        `scale=-2:${rung.height}`,
        "-b:v",
        `${rung.bitrateKbps}k`,
        "-c:a",
        "aac",
        "-hls_time",
        "6",
        "-hls_playlist_type",
        "vod",
        outPath,
      ]);
      const key = `${input.videoAssetId}/${rung.name}.m3u8`;
      renditions.push({ resolution: rung.name, bitrateKbps: rung.bitrateKbps, storageKey: key });
      const rungContent = await fs.readFile(outPath);
      await storage.putObject("transcoded", key, rungContent, "application/vnd.apple.mpegurl");
    }

    const thumbPath = path.join(workDir, "thumb.jpg");
    await run("ffmpeg", ["-y", "-i", masterPath, "-ss", "00:00:03", "-frames:v", "1", thumbPath]);
    const thumbnailKey = `${input.videoAssetId}/thumbnail.jpg`;
    await storage.putObject("thumbnails", thumbnailKey, await fs.readFile(thumbPath), "image/jpeg");

    const previewPath = path.join(workDir, "preview.mp4");
    await run("ffmpeg", ["-y", "-i", masterPath, "-ss", "00:00:00", "-t", "30", "-an", previewPath]);
    const previewKey = `${input.videoAssetId}/preview.mp4`;
    await storage.putObject("previews", previewKey, await fs.readFile(previewPath), "video/mp4");

    const masterManifestKey = `${input.videoAssetId}/master.m3u8`;
    const masterManifest = [
      "#EXTM3U",
      ...ladder.map(
        (r) => `#EXT-X-STREAM-INF:BANDWIDTH=${r.bitrateKbps * 1000},RESOLUTION=${resolutionDims(r.height)}\n${r.name}.m3u8`,
      ),
    ].join("\n");
    await storage.putObject("transcoded", masterManifestKey, masterManifest, "application/vnd.apple.mpegurl");

    await fs.rm(workDir, { recursive: true, force: true });

    return {
      hlsManifestKey: masterManifestKey,
      renditions,
      thumbnailKey,
      previewKey,
      durationSeconds,
    };
  }
}

function resolutionDims(height: number) {
  const width = Math.round((height * 16) / 9 / 2) * 2;
  return `${width}x${height}`;
}
