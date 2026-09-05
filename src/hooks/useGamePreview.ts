import { useCallback, useEffect, useRef, useState } from "react";
import { VIDEO_EXT } from "../constants";
import type { GameGroup } from "../types";
import {
  snapshotVideoFrame,
  SUPPORTS_RVFC,
} from "../utils/gameCardMedia";

const SLIDESHOW_INTERVAL = 1500;
const VIDEO_PREVIEW_DURATION = 5000;
const CROSSFADE_MS = 150;

const prefersReducedMotion = () =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export interface GamePreviewState {
  isPreviewing: boolean;
  slideIndex: number;
  slideUrl: string | null;
  slideLoaded: boolean;
  prevSnapshotUrl: string | null;
  slideIsVideo: boolean;
  handleVideoRef: (element: HTMLVideoElement | null) => void;
  handleVideoEnded: () => void;
  handleSlideReady: () => void;
  handlePreviewStart: () => void;
  handlePreviewStop: () => void;
}

export function useGamePreview(files: GameGroup["files"]): GamePreviewState {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideUrl, setSlideUrl] = useState<string | null>(null);
  const [slideLoaded, setSlideLoaded] = useState(false);
  const [prevSnapshotUrl, setPrevSnapshotUrl] = useState<string | null>(null);
  const currentIsVideoRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const fadeTimerRef = useRef<number | undefined>(undefined);

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

  const fileCount = files.length;

  const stopVideo = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }, []);

  const advanceSlide = useCallback(() => {
    setSlideIndex((previous) => (previous + 1) % fileCount);
  }, [fileCount]);

  useEffect(() => {
    if (!isPreviewing || fileCount === 0) {
      stopVideo();
      setSlideUrl(null);
      setPrevSnapshotUrl(null);
      setSlideIndex(0);
      clearTimeout(timerRef.current);
      clearTimeout(fadeTimerRef.current);
      return;
    }

    const file = files[slideIndex];
    if (!file) return;
    const isVideo = file.file.name.endsWith(VIDEO_EXT);

    // Snapshot outgoing slide to hold it visible during the crossfade.
    // Don't call stopVideo() here — it would blank the <video> element
    // before React re-renders, flashing the default thumbnail. React
    // handles unmounting the old element via the key={slideUrl} change.
    if (currentIsVideoRef.current && videoRef.current) {
      setPrevSnapshotUrl(snapshotVideoFrame(videoRef.current));
    } else if (slideUrl) {
      setPrevSnapshotUrl(slideUrl);
    }

    const url = getBlobUrl(file.file);
    currentIsVideoRef.current = isVideo;
    setSlideLoaded(false);
    setSlideUrl(url);

    if (fileCount > 1) {
      timerRef.current = window.setTimeout(
        advanceSlide,
        isVideo ? VIDEO_PREVIEW_DURATION : SLIDESHOW_INTERVAL,
      );
    }

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [isPreviewing, slideIndex, files, fileCount, stopVideo, getBlobUrl, advanceSlide]); // eslint-disable-line react-hooks/exhaustive-deps -- slideUrl read is intentional for snapshot

  useEffect(() => {
    const blobCache = blobCacheRef.current;
    return () => {
      clearTimeout(fadeTimerRef.current);
      stopVideo();
      for (const url of blobCache.values()) {
        URL.revokeObjectURL(url);
      }
      blobCache.clear();
    };
  }, [stopVideo]);

  const handleSlideReady = useCallback(() => {
    setSlideLoaded(true);
    clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = window.setTimeout(() => {
      setPrevSnapshotUrl(null);
    }, CROSSFADE_MS);
  }, []);

  const handleVideoRef = useCallback(
    (element: HTMLVideoElement | null) => {
      videoRef.current = element;
      if (element && SUPPORTS_RVFC) {
        element.requestVideoFrameCallback(handleSlideReady);
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

  // Start the preview on hover OR keyboard focus (keyboard/touch users can't
  // hover). Suppress the JS-driven slideshow/video autoplay entirely under
  // prefers-reduced-motion — the static thumbnail stays put.
  const handlePreviewStart = useCallback(() => {
    if (!prefersReducedMotion()) setIsPreviewing(true);
  }, []);
  const handlePreviewStop = useCallback(() => setIsPreviewing(false), []);

  return {
    isPreviewing,
    slideIndex,
    slideUrl,
    slideLoaded,
    prevSnapshotUrl,
    slideIsVideo: slideUrl != null && currentIsVideoRef.current,
    handleVideoRef,
    handleVideoEnded,
    handleSlideReady,
    handlePreviewStart,
    handlePreviewStop,
  };
}
