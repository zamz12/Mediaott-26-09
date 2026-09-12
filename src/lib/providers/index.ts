import type { StorageProvider } from "./storage.provider";
import { S3StorageProvider } from "./storage.s3";
import { LocalFsStorageProvider } from "./storage.local";
import type { TranscodeProvider } from "./transcode.provider";
import type { TranscriptionProvider } from "./transcription.provider";
import { StubTranscriptionProvider } from "./transcription.stub";
import type { NotificationProvider } from "./notification.provider";
import { ConsoleNotificationProvider } from "./notification.console";
import type { PaymentProvider } from "./payment.provider";
import { NoopPaymentProvider } from "./payment.noop";
import type { SearchProvider } from "./search.provider";
import { PostgresSearchProvider } from "./search.postgres";

// Every provider is selected once, from env, behind a lazily-initialised
// singleton. Business logic (services) only ever imports from this file —
// never a concrete provider class — so swapping vendors is a one-line change.

let storageProvider: StorageProvider | undefined;
export function getStorageProvider(): StorageProvider {
  if (!storageProvider) {
    storageProvider =
      process.env.STORAGE_ENDPOINT || process.env.NODE_ENV === "production"
        ? new S3StorageProvider()
        : new LocalFsStorageProvider();
  }
  return storageProvider;
}

let transcodeProvider: TranscodeProvider | undefined;
export async function getTranscodeProviderAsync(): Promise<TranscodeProvider> {
  if (!transcodeProvider) {
    // Lazy dynamic import to avoid pulling child_process into edge/client bundles.
    const { LocalFfmpegTranscodeProvider } = await import("./transcode.local-ffmpeg");
    transcodeProvider = new LocalFfmpegTranscodeProvider();
  }
  return transcodeProvider;
}

let transcriptionProvider: TranscriptionProvider | undefined;
export function getTranscriptionProvider(): TranscriptionProvider {
  if (!transcriptionProvider) transcriptionProvider = new StubTranscriptionProvider();
  return transcriptionProvider;
}

let notificationProvider: NotificationProvider | undefined;
export function getNotificationProvider(): NotificationProvider {
  if (!notificationProvider) notificationProvider = new ConsoleNotificationProvider();
  return notificationProvider;
}

let paymentProvider: PaymentProvider | undefined;
export function getPaymentProvider(): PaymentProvider {
  if (!paymentProvider) paymentProvider = new NoopPaymentProvider();
  return paymentProvider;
}

let searchProvider: SearchProvider | undefined;
export function getSearchProvider(): SearchProvider {
  if (!searchProvider) searchProvider = new PostgresSearchProvider();
  return searchProvider;
}
