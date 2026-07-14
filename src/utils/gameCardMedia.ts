export const SUPPORTS_RVFC =
  typeof HTMLVideoElement !== "undefined" &&
  "requestVideoFrameCallback" in HTMLVideoElement.prototype;

let snapshotCanvas: HTMLCanvasElement | null = null;

export function snapshotVideoFrame(video: HTMLVideoElement): string | null {
  if (!video.videoWidth) return null;
  if (!snapshotCanvas) snapshotCanvas = document.createElement("canvas");
  snapshotCanvas.width = video.videoWidth;
  snapshotCanvas.height = video.videoHeight;
  snapshotCanvas.getContext("2d")!.drawImage(video, 0, 0);
  return snapshotCanvas.toDataURL("image/jpeg", 0.85);
}

// Throttle concurrent video thumbnail extractions to prevent Safari page freeze.
const MAX_VIDEO_THUMB_CONCURRENCY = 2;
let activeVideoThumbs = 0;
const pendingVideoThumbs: (() => void)[] = [];

export function acquireVideoThumbSlot(): {
  promise: Promise<void>;
  cancel: () => void;
} {
  if (activeVideoThumbs < MAX_VIDEO_THUMB_CONCURRENCY) {
    activeVideoThumbs++;
    return { promise: Promise.resolve(), cancel: () => {} };
  }

  let entry: (() => void) | null = null;
  const promise = new Promise<void>((resolve) => {
    entry = resolve;
    pendingVideoThumbs.push(resolve);
  });

  return {
    promise,
    cancel: () => {
      const index = pendingVideoThumbs.indexOf(entry!);
      if (index !== -1) pendingVideoThumbs.splice(index, 1);
    },
  };
}

export function releaseVideoThumbSlot(): void {
  const next = pendingVideoThumbs.shift();
  if (next) next();
  else activeVideoThumbs--;
}
