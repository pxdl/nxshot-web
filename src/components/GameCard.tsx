import { memo, useMemo } from "react";
import { CheckIcon, VideoCameraIcon, TrophyIcon } from "@heroicons/react/24/solid";
import { Spinner } from "./Spinner";
import type { GameGroup } from "../types";
import { SHORT_MONTH_NAMES } from "../constants";
import { useGamePreview } from "../hooks/useGamePreview";
import { useGameThumbnail } from "../hooks/useGameThumbnail";
import { SUPPORTS_RVFC } from "../utils/gameCardMedia";

const MAX_STAGGER_INDEX = 15;
const STAGGER_DELAY_S = 0.04;

interface GameCardProps {
  group: GameGroup;
  selected: boolean;
  onToggle: (gameName: string) => void;
  index: number;
  isTopGame: boolean;
}

export const GameCard = memo(function GameCard({ group, selected, onToggle, index, isTopGame }: GameCardProps) {
  const {
    thumbnailUrl,
    thumbnailType,
    imageCount,
    videoCount,
    tabResumeKey,
  } = useGameThumbnail(group.files);

  const {
    isPreviewing,
    slideIndex,
    slideUrl,
    slideLoaded,
    prevSnapshotUrl,
    slideIsVideo,
    handleVideoRef,
    handleVideoEnded,
    handleSlideReady,
    handlePreviewStart,
    handlePreviewStop,
  } = useGamePreview(group.files);

  const fileCount = group.files.length;

  const latestDate = useMemo(() => {
    if (!group.latestTimestamp) return null;
    const year = Math.floor(group.latestTimestamp / 10_000_000_000);
    const month = Math.floor((group.latestTimestamp % 10_000_000_000) / 100_000_000);
    return `${SHORT_MONTH_NAMES[month]} ${year}`;
  }, [group.latestTimestamp]);

  const mediaClass = `w-full h-full object-cover absolute inset-0 z-[1] ${prevSnapshotUrl ? "transition-opacity duration-150" : ""} ${slideLoaded ? "opacity-100" : "opacity-0"}`;
  const prevMediaClass = "w-full h-full object-cover absolute inset-0 z-[1] pointer-events-none";

  const staggerDelay = Math.min(index * STAGGER_DELAY_S, MAX_STAGGER_INDEX * STAGGER_DELAY_S);

  return (
    <button
      type="button"
      onClick={() => onToggle(group.gameName)}
      onMouseEnter={handlePreviewStart}
      onMouseLeave={handlePreviewStop}
      onFocus={handlePreviewStart}
      onBlur={handlePreviewStop}
      aria-pressed={selected}
      aria-label={`${group.gameName}, ${fileCount} ${fileCount === 1 ? "capture" : "captures"}`}
      className={`relative rounded-xl overflow-hidden text-left transition-[transform,box-shadow] duration-200 ease-snappy cursor-pointer bg-white dark:bg-[#161b22] focus-visible:outline-2 focus-visible:outline-nx active:scale-[0.98] active:duration-100 animate-fade-up ${
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
        {isPreviewing && prevSnapshotUrl && (
          <img src={prevSnapshotUrl} alt="" className={prevMediaClass} />
        )}

        {/* Current slide */}
        {isPreviewing && slideUrl && (
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
              {thumbnailType === "video" ? (
                <Spinner key={tabResumeKey} className="w-6 h-6 text-stone-300 dark:text-slate-600" />
              ) : (
                <VideoCameraIcon className="w-6 h-6 text-stone-300 dark:text-slate-600" />
              )}
              <p className="text-[10px] font-display font-semibold text-stone-500 dark:text-slate-400 text-center leading-tight truncate max-w-full">
                {group.gameName}
              </p>
            </div>
          </div>
        )}

        {/* Slideshow dots (up to 12 files) */}
        {isPreviewing && fileCount > 1 && fileCount <= 12 && (
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
          {selected && <CheckIcon className="w-3.5 h-3.5 animate-check-pop" />}
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
            <p className="text-[10px] text-stone-500 dark:text-slate-400 font-mono tabular-nums shrink-0 ml-2">
              {latestDate}
            </p>
          )}
        </div>
      </div>
    </button>
  );
});
