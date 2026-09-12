// TranscriptionProvider — speech-to-text with timestamps + language
// detection. Output is ALWAYS treated as a draft: the creator/editor must
// review and approve before a Subtitle row is marked isReviewed (Section 11).

export interface TranscriptSegment {
  startMs: number;
  endMs: number;
  text: string;
}

export interface TranscriptionResult {
  detectedLanguageCode: string;
  segments: TranscriptSegment[];
}

export interface TranscriptionProvider {
  transcribe(bucket: string, key: string): Promise<TranscriptionResult>;
}
