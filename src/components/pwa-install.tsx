"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Registers the service worker and surfaces the native install prompt
// (Section 27). Silently does nothing on browsers without PWA support.
export function PwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // registration failure shouldn't break the app — just no offline shell
      });
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 z-50 flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3 shadow-xl md:bottom-4 md:left-auto md:right-4 md:w-80">
      <Download size={20} className="shrink-0 text-[var(--color-accent)]" />
      <div className="flex-1 text-sm">
        <p className="font-medium">Install LOKAL</p>
        <p className="text-[var(--color-fg-muted)]">Add to your home screen for the full app experience.</p>
      </div>
      <button
        type="button"
        className="focus-ring shrink-0 rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-black"
        onClick={async () => {
          await deferredPrompt.prompt();
          await deferredPrompt.userChoice;
          setDeferredPrompt(null);
        }}
      >
        Install
      </button>
      <button type="button" aria-label="Dismiss" className="focus-ring shrink-0 text-[var(--color-fg-muted)]" onClick={() => setDismissed(true)}>
        <X size={16} />
      </button>
    </div>
  );
}
