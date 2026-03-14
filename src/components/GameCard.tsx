import { memo, useEffect, useMemo, useState } from "react";
import { CheckIcon, VideoCameraIcon } from "@heroicons/react/24/solid";
import type { GameGroup } from "../types";
import { IMAGE_EXT, VIDEO_EXT } from "../constants";

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

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative rounded-xl overflow-hidden text-left transition-all duration-200 cursor-pointer bg-white dark:bg-[#161b22] hover:shadow-lg focus-visible:outline-2 focus-visible:outline-nx active:scale-[0.98] ${
        selected
          ? "ring-2 ring-nx shadow-md shadow-nx/10"
          : "ring-1 ring-stone-200/80 dark:ring-slate-700/50 opacity-50 hover:opacity-75"
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-stone-100 dark:bg-slate-800/80 relative overflow-hidden">
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

        {/* Checkbox overlay */}
        <div
          className={`absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center transition-colors ${
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
