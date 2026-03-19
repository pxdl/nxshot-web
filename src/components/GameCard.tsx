import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, VideoCameraIcon, TrophyIcon } from "@heroicons/react/24/solid";
import { Spinner } from "./Spinner";
import type { GameGroup } from "../types";
import { IMAGE_EXT, VIDEO_EXT, SHORT_MONTH_NAMES } from "../constants";

const SLIDESHOW_INTERVAL = 1500;
const VIDEO_PREVIEW_DURATION = 5000;
const CROSSFADE_MS = 150;
const MAX_STAGGER_INDEX = 15;
const STAGGER_DELAY_S = 0.04;
const THUMB_W = 320;
const SUPPORTS_RVFC =
  typeof HTMLVideoElement !== "undefined" &&
  "requestVideoFrameCallback" in HTMLVideoElement.prototype;


let _snapshotCanvas: HTMLCanvasElement | null = null;
function snapshotVideoFrame(video: HTMLVideoElement): string | null {
  if (!video.videoWidth) return null;
  if (!_snapshotCanvas) _snapshotCanvas = document.createElement("canvas");
  _snapshotCanvas.width = video.videoWidth;
  _snapshotCanvas.height = video.videoHeight;
  _snapshotCanvas.getContext("2d")!.drawImage(video, 0, 0);
  return _snapshotCanvas.toDataURL("image/jpeg", 0.85);
}

// Throttle concurrent video thumbnail extractions to prevent Safari page freeze
const MAX_VIDEO_THUMB_CONCURRENCY = 2;
let _activeVideoThumbs = 0;
const _pendingVideoThumbs: (() => void)[] = [];

function acquireVideoThumbSlot(): { promise: Promise<void>; cancel: () => void } {
  if (_activeVideoThumbs < MAX_VIDEO_THUMB_CONCURRENCY) {
    _activeVideoThumbs++;
    return { promise: Promise.resolve(), cancel: () => {} };
  }
  let entry: (() => void) | null = null;
  const promise = new Promise<void>((resolve) => {
    entry = resolve;
    _pendingVideoThumbs.push(resolve);
  });
  return {
    promise,
    cancel: () => {
      const idx = _pendingVideoThumbs.indexOf(entry!);
      if (idx !== -1) _pendingVideoThumbs.splice(idx, 1);
    },
  };
}

function releaseVideoThumbSlot(): void {
  const next = _pendingVideoThumbs.shift();
  if (next) next();
  else _activeVideoThumbs--;
}

// Single shared visibilitychange listener for tab resume detection (lazy)
let _tabResumeCount = 0;
let _listenerRegistered = false;
const _tabResumeCallbacks = new Set<() => void>();

function ensureVisibilityListener(): void {
  if (_listenerRegistered) return;
  _listenerRegistered = true;
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      _tabResumeCount++;
      for (const fn of _tabResumeCallbacks) fn();
    }
  });
}

function useTabResumeKey(active: boolean): number {
  const [key, setKey] = useState(_tabResumeCount);
  const lastSeenRef = useRef(_tabResumeCount);
  useEffect(() => {
    if (!active) return;
    ensureVisibilityListener();
    if (_tabResumeCount !== lastSeenRef.current) {
      lastSeenRef.current = _tabResumeCount;
      setKey(_tabResumeCount);
    }
    const fn = () => {
      lastSeenRef.current = _tabResumeCount;
      setKey(_tabResumeCount);
    };
    _tabResumeCallbacks.add(fn);
    return () => { _tabResumeCallbacks.delete(fn); };
  }, [active]);
  return key;
}

interface GameCardProps {
  group: GameGroup;
  selected: boolean;
  onToggle: () => void;
  index: number;
  isTopGame: boolean;
}

export const GameCard = memo(function GameCard({ group, selected, onToggle, index, isTopGame }: GameCardProps) {
  const { thumbnailSource, imageCount, videoCount } = useMemo(() => {
    let thumbnail: { file: File; type: "image" | "video" } | null = null;
    let images = 0;
    let videos = 0;
    for (const f of group.files) {
      const name = f.file.name;
      if (name.endsWith(IMAGE_EXT)) {
        images++;
        if (!thumbnail) thumbnail = { file: f.file, type: "image" };
      } else if (name.endsWith(VIDEO_EXT)) {
        videos++;
        if (!thumbnail) thumbnail = { file: f.file, type: "video" };
      }
    }
    return { thumbnailSource: thumbnail, imageCount: images, videoCount: videos };
  }, [group.files]);

  const latestDate = useMemo(() => {
    if (!group.latestTimestamp) return null;
    const year = Math.floor(group.latestTimestamp / 10_000_000_000);
    const month = Math.floor((group.latestTimestamp % 10_000_000_000) / 100_000_000);
    return `${SHORT_MONTH_NAMES[month]} ${year}`;
  }, [group.latestTimestamp]);

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // Restart spinner animation on Safari tab resume (single shared listener)
  const tabResumeKey = useTabResumeKey(!thumbnailUrl);

  useEffect(() => {
    if (!thumbnailSource) return;

    if (thumbnailSource.type === "image") {
      const url = URL.createObjectURL(thumbnailSource.file);
      setThumbnailUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    // Extract first frame from video (throttled for Safari performance)
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    const { promise: slotReady, cancel: cancelSlot } = acquireVideoThumbSlot();

    slotReady.then(() => {
      if (cancelled) { releaseVideoThumbSlot(); return; }

      const videoUrl = URL.createObjectURL(thumbnailSource.file);
      const video = document.createElement("video");
      video.muted = true;
      video.preload = "metadata";
      // Attach to DOM so Safari composites frames — requestVideoFrameCallback
      // only fires for videos the browser is actively rendering.
      video.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1";
      video.setAttribute("aria-hidden", "true");
      document.body.appendChild(video);

      let cleaned = false;
      let timerId: ReturnType<typeof setTimeout> | undefined;
      const cleanupVideo = () => {
        if (cleaned) return;
        cleaned = true;
        clearTimeout(timerId);
        URL.revokeObjectURL(videoUrl);
        video.removeAttribute("src");
        video.load();
        video.remove();
        releaseVideoThumbSlot();
      };
      cleanup = cleanupVideo;

      let captured = false;
      const captureFrame = () => {
        if (captured || cancelled || !video.videoWidth) { cleanupVideo(); return; }
        captured = true;
        const thumbH = Math.round((video.videoHeight / video.videoWidth) * THUMB_W);
        const canvas = document.createElement("canvas");
        canvas.width = THUMB_W;
        canvas.height = thumbH;
        canvas.getContext("2d")!.drawImage(video, 0, 0, THUMB_W, thumbH);
        canvas.toBlob((blob) => {
          cleanupVideo();
          if (blob && !cancelled) {
            setThumbnailUrl(URL.createObjectURL(blob));
          }
        }, "image/jpeg");
      };

      // rVFC fires when the frame is composited (reliable now that the video
      // is in the DOM). Timeout runs in parallel as a fallback — the `captured`
      // guard ensures only the first to fire does the work.
      video.addEventListener("seeked", () => {
        if (cancelled) { cleanupVideo(); return; }
        if (SUPPORTS_RVFC) video.requestVideoFrameCallback(captureFrame);
        timerId = setTimeout(captureFrame, 200);
      }, { once: true });

      video.addEventListener("error", () => cleanupVideo(), { once: true });

      video.addEventListener("loadedmetadata", () => {
        video.currentTime = 0.1;
      }, { once: true });

      video.src = videoUrl;
    });

    return () => {
      cancelled = true;
      cancelSlot();
      cleanup?.();
      setThumbnailUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [thumbnailSource]);

  // --- Hover slideshow ---
  const [isHovering, setIsHovering] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideUrl, setSlideUrl] = useState<string | null>(null);
  const [slideLoaded, setSlideLoaded] = useState(false);
  const [prevSnapshotUrl, setPrevSnapshotUrl] = useState<string | null>(null);
  const currentIsVideoRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Cache blob URLs per File so they're reused across hovers instead of
  // creating (and re-buffering) a new URL every time.
  const blobCacheRef = useRef(new Map<File, string>());
  const getBlobUrl = useCallback((file: File) => {
    let url = blobCacheRef.current.get(file);
    if (!url) {
      url = URL.createObjectURL(file);
      blobCacheRef.current.set(file, url);
    }
    return url;
  }, []);

  const fileCount = group.files.length;

  const stopVideo = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.removeAttribute("src");
      v.load();
    }
  }, []);

  const advanceSlide = useCallback(() => {
    setSlideIndex((prev) => (prev + 1) % fileCount);
  }, [fileCount]);

  useEffect(() => {
    if (!isHovering || fileCount === 0) {
      stopVideo();
      setSlideUrl(null);
      setPrevSnapshotUrl(null);
      setSlideIndex(0);
      clearTimeout(timerRef.current);
      clearTimeout(fadeTimerRef.current);
      return;
    }

    const file = group.files[slideIndex];
    if (!file) return;
    const isVideo = file.file.name.endsWith(VIDEO_EXT);

    // Snapshot outgoing slide to hold it visible during the transition
    if (currentIsVideoRef.current && videoRef.current) {
      setPrevSnapshotUrl(snapshotVideoFrame(videoRef.current));
      stopVideo();
    } else if (slideUrl) {
      setPrevSnapshotUrl(slideUrl);
    }

    const url = getBlobUrl(file.file);
    currentIsVideoRef.current = isVideo;
    setSlideLoaded(false);
    setSlideUrl(url);

    if (fileCount > 1) {
      timerRef.current = setTimeout(advanceSlide, isVideo ? VIDEO_PREVIEW_DURATION : SLIDESHOW_INTERVAL);
    }

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [isHovering, slideIndex, group.files, fileCount, stopVideo, getBlobUrl, advanceSlide]); // eslint-disable-line react-hooks/exhaustive-deps -- slideUrl read is intentional for snapshot

  // Revoke all cached blob URLs on unmount
  useEffect(() => {
    return () => {
      clearTimeout(fadeTimerRef.current);
      stopVideo();
      for (const url of blobCacheRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      blobCacheRef.current.clear();
    };
  }, [stopVideo]);

  const handleSlideReady = useCallback(() => {
    setSlideLoaded(true);
    clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => {
      setPrevSnapshotUrl(null);
    }, CROSSFADE_MS);
  }, []);

  const handleVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el && SUPPORTS_RVFC) {
        el.requestVideoFrameCallback(handleSlideReady);
      }
    },
    [handleSlideReady],
  );

  const handleVideoEnded = useCallback(() => {
    if (fileCount > 1) {
      clearTimeout(timerRef.current);
      advanceSlide();
    }
  }, [fileCount, advanceSlide]);

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => setIsHovering(false), []);

  const slideIsVideo = slideUrl != null && currentIsVideoRef.current;
  const mediaClass = `w-full h-full object-cover absolute inset-0 z-[1] ${prevSnapshotUrl ? "transition-opacity duration-150" : ""} ${slideLoaded ? "opacity-100" : "opacity-0"}`;
  const prevMediaClass = "w-full h-full object-cover absolute inset-0 z-[1] pointer-events-none";

  const staggerDelay = Math.min(index * STAGGER_DELAY_S, MAX_STAGGER_INDEX * STAGGER_DELAY_S);

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative rounded-xl overflow-hidden text-left transition-all duration-200 cursor-pointer bg-white dark:bg-[#161b22] focus-visible:outline-2 focus-visible:outline-nx active:scale-[0.98] animate-fade-up ${
        selected
          ? "ring-2 ring-nx shadow-lg shadow-nx/15 hover:shadow-xl hover:shadow-nx/20 hover:-translate-y-0.5"
          : "ring-1 ring-stone-200/80 dark:ring-slate-700/50 hover:ring-stone-300 dark:hover:ring-slate-600 hover:shadow-lg hover:-translate-y-0.5"
      }`}
      style={{ animationDelay: `${staggerDelay}s` }}
    >
      {/* Top game gradient accent */}
      {isTopGame && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 z-[3]" />
      )}

      {/* Thumbnail / Slideshow */}
      <div className={`aspect-video bg-stone-100 dark:bg-slate-800/80 relative overflow-hidden transition-[filter] duration-300 ${
        selected ? "" : "grayscale-[0.5] brightness-[0.8]"
      }`}>
        {/* Previous slide snapshot (holds during transition to prevent flash) */}
        {isHovering && prevSnapshotUrl && (
          <img src={prevSnapshotUrl} alt="" className={prevMediaClass} />
        )}

        {/* Current slide */}
        {isHovering && slideUrl && (
          slideIsVideo ? (
            <video
              key={slideUrl}
              ref={handleVideoRef}
              src={slideUrl}
              className={mediaClass}
              autoPlay
              muted
              playsInline
              onEnded={handleVideoEnded}
              onLoadedData={SUPPORTS_RVFC ? undefined : handleSlideReady}
            />
          ) : (
            <img
              key={slideUrl}
              src={slideUrl}
              alt=""
              className={mediaClass}
              onLoad={handleSlideReady}
            />
          )
        )}

        {/* Default thumbnail */}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-700">
            <div className="flex flex-col items-center gap-1.5 px-3">
              {thumbnailSource?.type === "video" ? (
                <Spinner key={tabResumeKey} className="w-6 h-6 text-stone-300 dark:text-slate-600" />
              ) : (
                <VideoCameraIcon className="w-6 h-6 text-stone-300 dark:text-slate-600" />
              )}
              <p className="text-[10px] font-display font-semibold text-stone-300 dark:text-slate-600 text-center leading-tight truncate max-w-full">
                {group.gameName}
              </p>
            </div>
          </div>
        )}

        {/* Slideshow dots (up to 12 files) */}
        {isHovering && fileCount > 1 && fileCount <= 12 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-[2] bg-black/30 backdrop-blur-sm rounded-full px-2 py-1">
            {group.files.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === slideIndex ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        )}

        {/* Top game badge */}
        {isTopGame && (
          <div className="absolute top-2 left-2 z-[2] flex items-center gap-1 bg-amber-400/90 backdrop-blur-sm text-amber-900 rounded-md px-1.5 py-0.5 shadow-sm">
            <TrophyIcon className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-wide">#1</span>
          </div>
        )}

        {/* Checkbox overlay */}
        <div
          className={`absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center transition-colors z-[2] ${
            selected
              ? "bg-nx text-white shadow-sm"
              : "bg-white/80 dark:bg-[#161b22]/80 border border-stone-300 dark:border-slate-600"
          }`}
        >
          {selected && <CheckIcon className="w-3.5 h-3.5 animate-check-bounce" />}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p
          className="font-medium text-sm text-stone-800 dark:text-slate-200 truncate"
          title={group.gameName}
        >
          {group.gameName}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-stone-500 dark:text-slate-400">
            {imageCount > 0 &&
              `${imageCount} screenshot${imageCount !== 1 ? "s" : ""}`}
            {imageCount > 0 && videoCount > 0 && " \u00b7 "}
            {videoCount > 0 &&
              `${videoCount} video${videoCount !== 1 ? "s" : ""}`}
          </p>
          {latestDate && (
            <p className="text-[10px] text-stone-400 dark:text-slate-400 font-mono tabular-nums shrink-0 ml-2">
              {latestDate}
            </p>
          )}
        </div>
      </div>
    </button>
  );
});
