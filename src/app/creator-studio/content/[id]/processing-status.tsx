"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The content editor is a server component with no live connection to the
// transcode worker — this is the cheapest way to make "Processing…" feel
// alive without websockets: re-fetch the page's server data on an interval
// until the status stops being PROCESSING, then stop.
export function AutoRefreshWhileProcessing({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(interval);
  }, [active, router]);

  return null;
}
