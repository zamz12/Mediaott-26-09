"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  PictureInPicture2,
  SkipForward,
  SkipBack,
  Settings,
  Captions,
} from "lucide-react";
import { clsx } from "clsx";
import type { PlaybackPayload } from "@/modules/streaming/service";

const PROGRESS_REPORT_INTERVAL_MS = 15000;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface PlayerProps {
  payload: PlaybackPayload;
  nextEpisodeHref?: string | null;
  previousEpisodeHref?: string | null;
}

function IframeEmbed({ src, title }: { src: string; title: string }) {
  return (
    <div className="aspect-video w-full bg-black">
      <iframe
        className="h-full w-full"
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

// Custom HLS-compatible player (Section 17). External sources render the
// provider's own embed instead — LOKAL never re-hosts YouTube/Vimeo/
// Dailymotion video, or another platform's live channel embed.
export function Player({ payload, nextEpisodeHref, previousEpisodeHref }: PlayerProps) {
  const { source, title } = payload;

  if (source.kind === "EXTERNAL_YOUTUBE") {
    return <IframeEmbed src={`https://www.youtube-nocookie.com/embed/${source.externalVideoId}`} title={title} />;
  }
  if (source.kind === "EXTERNAL_VIMEO") {
    return <IframeEmbed src={`https://player.vimeo.com/video/${source.externalVideoId}`} title={title} />;
  }
  if (source.kind === "EXTERNAL_DAILYMOTION") {
    return <IframeEmbed src={`https://www.dailymotion.com/embed/video/${source.externalVideoId}`} title={title} />;
  }
  // Previously fell through to HlsPlayer, which expects manifestUrl and
  // would just silently fail to load anything — OTHER (a broadcaster's own
  // embed link) and a LIVE channel set up as an embed (rather than an HLS
  // pull) both need the iframe path too, not just YouTube/Vimeo/Dailymotion.
  if (source.kind === "EXTERNAL_OTHER" && source.embedUrl) {
    return <IframeEmbed src={source.embedUrl} title={title} />;
  }
  if (source.kind === "LIVE" && source.embedUrl) {
    return <IframeEmbed src={source.embedUrl} title={title} />;
  }

  return <HlsPlayer payload={payload} nextEpisodeHref={nextEpisodeHref} previousEpisodeHref={previousEpisodeHref} />;
}

function HlsPlayer({ payload, nextEpisodeHref, previousEpisodeHref }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(payload.durationSeconds ?? 0);
  const [speed, setSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [levels, setLevels] = useState<{ index: number; height: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = auto
  const lastReportRef = useRef(0);
  const hlsRef = useRef<import("hls.js").default | null>(null);

  const report = useCallback(
    (event: "PLAY" | "PAUSE" | "PROGRESS" | "COMPLETE") => {
      const video = videoRef.current;
      if (!video) return;
      const body = JSON.stringify({ contentId: payload.contentId, positionSeconds: video.currentTime, durationSeconds: video.duration || undefined, event });

      const sent = navigator.sendBeacon?.("/api/watch-progress", new Blob([body], { type: "application/json" }));
      if (!sent) {
        fetch("/api/watch-progress", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
      }
    },
    [payload.contentId],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !payload.source.manifestUrl) return;

    async function setup() {
      const url = payload.source.manifestUrl!;
      if (video!.canPlayType("application/vnd.apple.mpegurl")) {
        video!.src = url;
      } else {
        const Hls = (await import("hls.js")).default;
        if (Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video!);
          hls.on(Hls.Events.MANIFEST_PARSED, (_evt, data) => {
            setLevels(data.levels.map((l, i) => ({ index: i, height: l.height })));
          });
        }
      }
      if (payload.resumePositionSeconds > 5) {
        video!.currentTime = payload.resumePositionSeconds;
      }
    }
    setup();

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [payload.source.manifestUrl, payload.resumePositionSeconds]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!videoRef.current || (e.target as HTMLElement)?.tagName === "INPUT") return;
      switch (e.code) {
        case "Space":
        case "KeyK":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          videoRef.current.currentTime += 10;
          break;
        case "ArrowLeft":
          videoRef.current.currentTime -= 10;
          break;
        case "KeyM":
          toggleMute();
          break;
        case "KeyF":
          toggleFullscreen();
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      report("PLAY");
    } else {
      video.pause();
      report("PAUSE");
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  }

  async function togglePip() {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else await video.requestPictureInPicture();
  }

  function onTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    setProgress(video.currentTime);
    if (video.duration) setDuration(video.duration);

    const now = Date.now();
    if (now - lastReportRef.current > PROGRESS_REPORT_INTERVAL_MS) {
      lastReportRef.current = now;
      report("PROGRESS");
    }
  }

  function onSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Number(e.target.value);
    setProgress(Number(e.target.value));
  }

  function selectLevel(index: number) {
    setCurrentLevel(index);
    if (hlsRef.current) hlsRef.current.currentLevel = index;
    setShowSettings(false);
  }

  function formatTime(seconds: number) {
    if (!Number.isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div ref={containerRef} className="group relative aspect-video w-full bg-black">
      <video
        ref={videoRef}
        className="h-full w-full"
        poster={payload.posterUrl ?? undefined}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onEnded={() => report("COMPLETE")}
        onVolumeChange={(e) => setVolume(e.currentTarget.volume)}
        playsInline
      >
        {payload.subtitles.map((sub) => (
          <track key={sub.languageCode} kind="subtitles" src={sub.url} srcLang={sub.languageCode} label={sub.label} />
        ))}
      </video>

      <div
        className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
        role="group"
        aria-label="Player controls"
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={progress}
          onChange={onSeek}
          aria-label="Seek"
          className="h-1 w-full cursor-pointer accent-[var(--color-accent)]"
        />

        <div className="flex items-center gap-3 text-white">
          {previousEpisodeHref && (
            <a href={previousEpisodeHref} aria-label="Previous episode" className="focus-ring rounded-full p-2 hover:bg-white/10">
              <SkipBack size={18} />
            </a>
          )}

          <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="focus-ring rounded-full p-2 hover:bg-white/10">
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>

          {nextEpisodeHref && (
            <a href={nextEpisodeHref} aria-label="Next episode" className="focus-ring rounded-full p-2 hover:bg-white/10">
              <SkipForward size={18} />
            </a>
          )}

          <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} className="focus-ring rounded-full p-2 hover:bg-white/10">
            {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => {
              const video = videoRef.current;
              if (!video) return;
              video.volume = Number(e.target.value);
              video.muted = Number(e.target.value) === 0;
            }}
            aria-label="Volume"
            className="h-1 w-20 cursor-pointer accent-[var(--color-accent)]"
          />

          <span className="text-xs tabular-nums text-white/80">
            {formatTime(progress)} / {formatTime(duration)}
          </span>

          <div className="ml-auto flex items-center gap-1">
            {payload.subtitles.length > 0 && (
              <span className="rounded-full p-2 text-white/70" title="Subtitles available">
                <Captions size={18} />
              </span>
            )}

            <div className="relative">
              <button type="button" onClick={() => setShowSettings((s) => !s)} aria-label="Settings" className="focus-ring rounded-full p-2 hover:bg-white/10">
                <Settings size={18} />
              </button>
              {showSettings && (
                <div className="absolute bottom-10 right-0 w-44 rounded-lg bg-black/95 p-2 text-sm text-white shadow-xl">
                  <p className="px-2 py-1 text-xs text-white/50">Speed</p>
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      className={clsx("block w-full rounded px-2 py-1 text-left hover:bg-white/10", speed === s && "text-[var(--color-accent)]")}
                      onClick={() => {
                        setSpeed(s);
                        if (videoRef.current) videoRef.current.playbackRate = s;
                        setShowSettings(false);
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                  {levels.length > 0 && (
                    <>
                      <p className="mt-2 px-2 py-1 text-xs text-white/50">Quality</p>
                      <button
                        className={clsx("block w-full rounded px-2 py-1 text-left hover:bg-white/10", currentLevel === -1 && "text-[var(--color-accent)]")}
                        onClick={() => selectLevel(-1)}
                      >
                        Auto
                      </button>
                      {levels.map((l) => (
                        <button
                          key={l.index}
                          className={clsx("block w-full rounded px-2 py-1 text-left hover:bg-white/10", currentLevel === l.index && "text-[var(--color-accent)]")}
                          onClick={() => selectLevel(l.index)}
                        >
                          {l.height}p
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            <button type="button" onClick={togglePip} aria-label="Picture in picture" className="focus-ring rounded-full p-2 hover:bg-white/10">
              <PictureInPicture2 size={18} />
            </button>
            <button type="button" onClick={toggleFullscreen} aria-label="Fullscreen" className="focus-ring rounded-full p-2 hover:bg-white/10">
              <Maximize size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
