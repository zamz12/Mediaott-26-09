// TranscodeProvider — turns a private master file into adaptive-bitrate HLS
// renditions + a thumbnail + a short preview clip. Implementations: local
// ffmpeg (dev) or AWS MediaConvert (prod). Never called synchronously from a
// request handler — always from the transcode worker (Section 13/14).

export interface TranscodeInput {
  videoAssetId: string;
  masterBucket: string;
  masterKey: string;
}

export interface TranscodeRendition {
  resolution: "1080p" | "720p" | "480p" | "360p";
  bitrateKbps: number;
  storageKey: string;
}

export interface TranscodeResult {
  hlsManifestKey: string;
  renditions: TranscodeRendition[];
  thumbnailKey: string;
  previewKey: string;
  durationSeconds: number;
}

export interface TranscodeProvider {
  transcode(input: TranscodeInput): Promise<TranscodeResult>;
}
