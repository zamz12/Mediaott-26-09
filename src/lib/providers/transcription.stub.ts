import type { TranscriptionProvider, TranscriptionResult } from "./transcription.provider";

// No-op stub for MVP/dev. Returns an empty draft transcript so the workflow
// (video -> extract audio -> speech-to-text -> creator review) is wired
// end-to-end without requiring a paid AWS Transcribe integration yet.
// Swap for AwsTranscribeProvider in Phase 2 by changing TRANSCRIPTION_PROVIDER.
export class StubTranscriptionProvider implements TranscriptionProvider {
  async transcribe(): Promise<TranscriptionResult> {
    return { detectedLanguageCode: "ms-MY", segments: [] };
  }
}
