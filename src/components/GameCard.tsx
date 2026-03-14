import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, VideoCameraIcon } from "@heroicons/react/24/solid";
import type { GameGroup } from "../types";
import { IMAGE_EXT, VIDEO_EXT } from "../constants";

const SLIDESHOW_INTERVAL = 1500;

interface GameCardProps {
  group: GameGroup;
  selected: boolean;
  onToggle: () => void;
}

export const GameCard = memo(function GameCard({ group, selected, onToggle }: GameCardProps) {
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

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!thumbnailSource) return;

    if (thumbnailSource.type === "image") {
      const url = URL.createObjectURL(thumbnailSource.file);
      setThumbnailUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    // Extract first frame from video
    const videoUrl = URL.createObjectURL(thumbnailSource.file);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";

    let cancelled = false;
    let cleaned = false;
    const cleanupVideo = () => {
      if (cleaned) return;
      cleaned = true;
      URL.revokeObjectURL(videoUrl);
      video.removeAttribute("src");
      video.load();
    };

    const THUMB_W = 320;
    video.addEventListener("seeked", () => {
      const thumbH = Math.round((video.videoHeight / video.videoWidth) * THUMB_W);
      const canvas = document.createElement("canvas");
      canvas.width = THUMB_W;
      canvas.height = thumbH;
      canvas.getContext("2d")!.drawImage(video, 0, 0, THUMB_W, thumbH);
      canvas.toBlob((blob) => {
        cleanupVideo();
        if (blob && !cancelled) {
          const frameUrl = URL.createObjectURL(blob);
          setThumbnailUrl(frameUrl);
        }
      }, "image/jpeg");
    }, { once: true });

    video.addEventListener("error", () => cleanupVideo(), { once: true });

    // Seek after metadata loads so currentTime is respected
    video.addEventListener("loadedmetadata", () => {
      video.currentTime = 0.1;
    }, { once: true });

    video.src = videoUrl;

    return () => {
      cancelled = true;
      cleanupVideo();
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
  const slideUrlRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fileCount = group.files.length;

  const revokeSlideUrl = useCallback(() => {
    if (slideUrlRef.current) {
      URL.revokeObjectURL(slideUrlRef.current);
      slideUrlRef.current = null;
    }
  }, []);

  const advanceSlide = useCallback(() => {
    setSlideIndex((prev) => (prev + 1) % fileCount);
  }, [fileCount]);

  useEffect(() => {
    if (!isHovering || fileCount === 0) {
      revokeSlideUrl();
      setSlideUrl(null);
      setSlideIndex(0);
      clearTimeout(timerRef.current);
      return;
    }

    const file = group.files[slideIndex];
    if (!file) return;
    const isVideo = file.file.name.endsWith(VIDEO_EXT);

    revokeSlideUrl();
    const url = URL.createObjectURL(file.file);
    slideUrlRef.current = url;
    setSlideUrl(url);

    if (!isVideo && fileCount > 1) {
      timerRef.current = setTimeout(advanceSlide, SLIDESHOW_INTERVAL);
    }

    return () => {
      clearTimeout(timerRef.current);
      revokeSlideUrl();
    };
  }, [isHovering, slideIndex, group.files, fileCount, revokeSlideUrl, advanceSlide]);

  const handleVideoEnded = useCallback(() => {
    if (fileCount > 1) advanceSlide();
  }, [fileCount, advanceSlide]);

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => setIsHovering(false), []);

  const slideIsVideo = slideUrl != null && group.files[slideIndex]?.file.name.endsWith(VIDEO_EXT);
  const mediaClass = "w-full h-full object-cover absolute inset-0 z-[1]";

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative rounded-xl overflow-hidden text-left transition-all duration-200 cursor-pointer bg-white dark:bg-[#161b22] hover:shadow-lg focus-visible:outline-2 focus-visible:outline-nx active:scale-[0.98] ${
        selected
          ? "ring-2 ring-nx shadow-md shadow-nx/10"
          : "ring-1 ring-stone-200/80 dark:ring-slate-700/50 opacity-50 hover:opacity-75"
      }`}
    >
      {/* Thumbnail / Slideshow */}
      <div className="aspect-video bg-stone-100 dark:bg-slate-800/80 relative overflow-hidden">
        {/* Slideshow layer (on hover) */}
        {isHovering && slideUrl && (
          slideIsVideo ? (
            <video
              key={slideUrl}
              src={slideUrl}
              className={mediaClass}
              autoPlay
              muted
              playsInline
              onEnded={handleVideoEnded}
            />
          ) : (
            <img
              key={slideUrl}
              src={slideUrl}
              alt=""
              className={mediaClass}
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
          <div className="w-full h-full flex items-center justify-center">
            <VideoCameraIcon className="w-8 h-8 text-stone-300 dark:text-slate-600" />
          </div>
        )}

        {/* Slideshow dots (up to 12 files) */}
        {isHovering && fileCount > 1 && fileCount <= 12 && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-[2]">
            {group.files.map((_, i) => (
              <div
                key={i}
                className={`w-1 h-1 rounded-full transition-colors ${
                  i === slideIndex ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
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
          {selected && <CheckIcon className="w-3.5 h-3.5" />}
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
        <p className="text-xs text-stone-400 dark:text-slate-500 mt-0.5">
          {imageCount > 0 &&
            `${imageCount} screenshot${imageCount !== 1 ? "s" : ""}`}
          {imageCount > 0 && videoCount > 0 && " · "}
          {videoCount > 0 &&
            `${videoCount} video${videoCount !== 1 ? "s" : ""}`}
        </p>
      </div>
    </button>
  );
});
