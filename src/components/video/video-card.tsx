"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Captions } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const HOVER_DELAY_MS = 400;
const MAX_PREVIEW_SECONDS = 30;

export interface VideoCardData {
  slug: string;
  title: string;
  posterUrl: string | null;
  previewUrl: string | null;
  languageLabel?: string | null;
  hasSubtitles?: boolean;
  badge?: string;
}

// 30-second content preview on hover/focus (Section 7). Muted by default,
// capped at MAX_PREVIEW_SECONDS, falls back to poster art when no preview
// asset exists. Never downloads the full master — previewUrl always points
// at the independently-generated preview clip.
export function VideoCard({ data }: { data: VideoCardData }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportedRef = useRef(false);

  function startHover() {
    if (!data.previewUrl) return;
    timerRef.current = setTimeout(() => {
      setPlaying(true);
      if (!reportedRef.current) {
        reportedRef.current = true;
        fetch("/api/analytics/preview-play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: data.slug }),
          keepalive: true,
        }).catch(() => {});
      }
    }, HOVER_DELAY_MS);
  }

  function endHover() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPlaying(false);
    videoRef.current?.pause();
    if (videoRef.current) videoRef.current.currentTime = 0;
  }

  function onTimeUpdate() {
    if (videoRef.current && videoRef.current.currentTime >= MAX_PREVIEW_SECONDS) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  }

  return (
    <Link
      href={`/title/${data.slug}`}
      className="focus-ring group relative block w-full shrink-0 overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-bg-elevated)] transition-transform duration-200 hover:z-10 hover:scale-105"
      onMouseEnter={startHover}
      onMouseLeave={endHover}
      onFocus={startHover}
      onBlur={endHover}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        {data.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.posterUrl}
            alt=""
            className="h-full w-full object-cover"
            style={{ opacity: playing ? 0 : 1 }}
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[var(--color-border)] to-[var(--color-bg-elevated)]" />
        )}
        {playing && data.previewUrl && (
          <video
            ref={videoRef}
            src={data.previewUrl}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            autoPlay
            playsInline
            onTimeUpdate={onTimeUpdate}
            onError={() => setPlaying(false)}
          />
        )}
        {data.badge && (
          <Badge tone="accent" className="absolute left-2 top-2">
            {data.badge}
          </Badge>
        )}
        {data.hasSubtitles && (
          <span className="absolute bottom-2 right-2 rounded bg-black/60 p-1 text-white">
            <Captions size={14} />
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="truncate text-sm font-medium">{data.title}</p>
        {data.languageLabel && <p className="truncate text-xs text-[var(--color-fg-muted)]">{data.languageLabel}</p>}
      </div>
    </Link>
  );
}
