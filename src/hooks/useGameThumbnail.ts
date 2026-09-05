import { useEffect, useMemo, useRef, useState } from "react";
import { IMAGE_EXT, VIDEO_EXT } from "../constants";
import type { GameGroup } from "../types";
import {
  acquireVideoThumbSlot,
  releaseVideoThumbSlot,
  SUPPORTS_RVFC,
} from "../utils/gameCardMedia";

const THUMB_W = 320;

let tabResumeCount = 0;
let listenerRegistered = false;
const tabResumeCallbacks = new Set<() => void>();

function ensureVisibilityListener(): void {
  if (listenerRegistered) return;
  listenerRegistered = true;
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      tabResumeCount++;
      for (const callback of tabResumeCallbacks) callback();
    }
  });
}

function useTabResumeKey(active: boolean): number {
  const [key, setKey] = useState(tabResumeCount);
  const lastSeenRef = useRef(tabResumeCount);

  useEffect(() => {
    if (!active) return;
    ensureVisibilityListener();
    if (tabResumeCount !== lastSeenRef.current) {
      lastSeenRef.current = tabResumeCount;
      setKey(tabResumeCount);
    }
    const callback = () => {
      lastSeenRef.current = tabResumeCount;
      setKey(tabResumeCount);
    };
    tabResumeCallbacks.add(callback);
    return () => {
      tabResumeCallbacks.delete(callback);
    };
  }, [active]);

  return key;
}

export interface GameThumbnailState {
  thumbnailUrl: string | null;
  thumbnailType: "image" | "video" | null;
  imageCount: number;
  videoCount: number;
  tabResumeKey: number;
}

export function useGameThumbnail(
  files: GameGroup["files"],
): GameThumbnailState {
  const { thumbnailSource, imageCount, videoCount } = useMemo(() => {
    let thumbnail: { file: File; type: "image" | "video" } | null = null;
    let images = 0;
    let videos = 0;
    for (const entry of files) {
      const name = entry.file.name;
      if (name.endsWith(IMAGE_EXT)) {
        images++;
        if (!thumbnail) thumbnail = { file: entry.file, type: "image" };
      } else if (name.endsWith(VIDEO_EXT)) {
        videos++;
        if (!thumbnail) thumbnail = { file: entry.file, type: "video" };
      }
    }
    return {
      thumbnailSource: thumbnail,
      imageCount: images,
      videoCount: videos,
    };
  }, [files]);

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const tabResumeKey = useTabResumeKey(!thumbnailUrl);

  useEffect(() => {
    if (!thumbnailSource) return;

    if (thumbnailSource.type === "image") {
      const url = URL.createObjectURL(thumbnailSource.file);
      setThumbnailUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    let cancelled = false;
    let cleanup: (() => void) | null = null;
    let thumbnailObjectUrl: string | null = null;
    const { promise: slotReady, cancel: cancelSlot } = acquireVideoThumbSlot();

    slotReady.then(() => {
      if (cancelled) {
        releaseVideoThumbSlot();
        return;
      }

      const videoUrl = URL.createObjectURL(thumbnailSource.file);
      const video = document.createElement("video");
      video.muted = true;
      video.preload = "metadata";
      // Attach to DOM so Safari composites frames — requestVideoFrameCallback
      // only fires for videos the browser is actively rendering.
      video.style.cssText =
        "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1";
      video.setAttribute("aria-hidden", "true");
      document.body.appendChild(video);

      let cleaned = false;
      let timerId: number | undefined;
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
        if (captured || cancelled || !video.videoWidth) {
          cleanupVideo();
          return;
        }
        captured = true;
        const thumbH = Math.round(
          (video.videoHeight / video.videoWidth) * THUMB_W,
        );
        const canvas = document.createElement("canvas");
        canvas.width = THUMB_W;
        canvas.height = thumbH;
        canvas
          .getContext("2d")!
          .drawImage(video, 0, 0, THUMB_W, thumbH);
        canvas.toBlob((blob) => {
          if (cancelled || !blob) {
            cleanupVideo();
            return;
          }
          cleanupVideo();
          thumbnailObjectUrl = URL.createObjectURL(blob);
          setThumbnailUrl(thumbnailObjectUrl);
        }, "image/jpeg");
      };

      video.addEventListener(
        "seeked",
        () => {
          if (cancelled) {
            cleanupVideo();
            return;
          }
          if (SUPPORTS_RVFC) video.requestVideoFrameCallback(captureFrame);
          timerId = window.setTimeout(captureFrame, 200);
        },
        { once: true },
      );
      video.addEventListener("error", cleanupVideo, { once: true });
      video.addEventListener(
        "loadedmetadata",
        () => {
          video.currentTime = 0.1;
        },
        { once: true },
      );
      video.src = videoUrl;
    });

    return () => {
      cancelled = true;
      cancelSlot();
      cleanup?.();
      if (thumbnailObjectUrl) {
        URL.revokeObjectURL(thumbnailObjectUrl);
        thumbnailObjectUrl = null;
      }
      setThumbnailUrl(null);
    };
  }, [thumbnailSource]);

  return {
    thumbnailUrl,
    thumbnailType: thumbnailSource?.type ?? null,
    imageCount,
    videoCount,
    tabResumeKey,
  };
}
