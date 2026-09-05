# 004 — Revoke generated video thumbnail URLs on unmount

- **Status**: DONE — merged (`37a516f`) and centrally verified; see [results](README.md#central-verification).
- **Commit**: 2dcfc83 (audit baseline; the orchestrator refreshes the execution base after any authorized dependencies)
- **Severity**: MEDIUM
- **Category**: Performance
- **Rule**: react-doctor/no-create-object-url-without-revoke
- **Dependencies**: None; reuse the existing React hook and browser `URL`/Blob APIs.
- **Estimated scope**: 1 existing source file; effect-local resource ownership only.

## Problem

`src/hooks/useGameThumbnail.ts:95-185` creates a JPEG object URL asynchronously after decoding a real video frame. The source video URL is owned by `cleanupVideo`, but the generated thumbnail URL is only passed to React state and is later revoked from a state updater. The confirmed runtime failure is that the generated `image/jpeg` URL at line 149 remains fetchable after the owning card unmounts: the cleanup updater at lines 181-184 can run before that asynchronous state update is applied (or never run for an unmounted component), so the URL is not necessarily the value that the updater revokes.

Current video branch:

```tsx
// src/hooks/useGameThumbnail.ts:95-185 — current
    let cancelled = false;
    let cleanup: (() => void) | null = null;
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
          cleanupVideo();
          if (blob && !cancelled) {
            setThumbnailUrl(URL.createObjectURL(blob));
          }
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
      setThumbnailUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
    };
```

The image path at `src/hooks/useGameThumbnail.ts:89-93` already owns and revokes its source URL directly. The video source URL at lines 105 and 122 is also correctly revoked by `cleanupVideo`, including the two-slot extraction release at line 126. Only the decoded JPEG URL is ownerless.

Do not “fix” this by revoking on a gallery-tab change. `src/components/Gallery.tsx:153-164` deliberately keeps the card grid mounted while switching tabs so thumbnail and preview caches survive, and `src/App.tsx:216-220` keeps the gallery subtree mounted for the same reason. The URL must live for that mounted card and be revoked when this hook's effect is cleaned up.

This is a confirmed failure, not a source-pattern-only warning: a real video was decoded, the `image/jpeg` URL was created, and the URL remained usable after the card was unmounted.

## Canonical rule recipe

Source: <https://www.react.doctor/prompts/rules/react-doctor/no-create-object-url-without-revoke.md>.

The occurrence-level rule recipe is:

> Call `URL.revokeObjectURL(url)` once the object URL is no longer needed (after the download, in a `useEffect` cleanup, or on unmount). An object URL keeps its Blob/File alive for the document lifetime until it is revoked.

The canonical reference transformation is:

```ts
// Before
const download = (blob) => {
  link.href = URL.createObjectURL(blob);
  link.click();
};

// After
const download = (blob) => {
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
};
```

Adapt that ownership rule to this hook: retain the generated URL in an effect-local variable, and revoke that exact variable directly from the effect cleanup. Do not disable or suppress the rule. Keep the cancellation guard in the asynchronous `toBlob` callback so a callback that resolves after cleanup cannot allocate a new URL.

## Target

Apply only the changed lines shown in the target effect at `src/hooks/useGameThumbnail.ts:86-186`; do not rewrite unchanged lines merely to match this complete context. Image/source-video cleanup, slot release, and mounted caching remain unchanged. The new `thumbnailObjectUrl` directly owns the generated JPEG URL.

```tsx
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
```

The `cancelled` check must occur before `URL.createObjectURL(blob)`. The callback still calls `cleanupVideo()` on both branches so the source video URL and extraction slot are released exactly as before. The direct cleanup revokes the generated JPEG URL once, then clears state without a state-updater side effect.

## Repo conventions to follow

- Keep the hook's existing effect-local asynchronous ownership pattern and local naming. Do not move decoding into render or introduce a global cache.
- Imitate the direct object-URL cleanup already used by `useGameThumbnail` for image sources at `src/hooks/useGameThumbnail.ts:89-93` and the per-hook cache cleanup in `src/hooks/useGamePreview.ts:111-121`.
- Preserve the mounted gallery cache contract in `src/components/Gallery.tsx:153-164` and `src/App.tsx:216-220`; do not revoke a URL merely because the gallery tab is hidden.
- Keep `THUMB_W`, `SUPPORTS_RVFC`, the hidden Safari video element, `canvas.toBlob`, and the two-slot extraction helpers unchanged.

## Steps

1. Confirm the source still matches the audit baseline at `src/hooks/useGameThumbnail.ts:86-186`. If unrelated edits are present, stop and report drift rather than merging around them.
2. Add `let thumbnailObjectUrl: string | null = null` to this effect's video branch, before the slot promise starts. This variable is the owner for the URL produced from the decoded JPEG Blob.
3. In the `canvas.toBlob` callback, call `cleanupVideo()` for the cancelled/empty-Blob branch and return. For an active non-empty Blob, clean up the source video first, create the JPEG object URL into `thumbnailObjectUrl`, and pass that exact URL to `setThumbnailUrl`.
4. In the returned effect cleanup, retain `cancelled = true`, `cancelSlot()`, `cleanup?.()`, and `setThumbnailUrl(null)`, but replace the state-updater revocation with a direct `URL.revokeObjectURL(thumbnailObjectUrl)` guarded by a null check. Clear the local variable after revocation so the cleanup is idempotent.
5. Keep edits tight and preserve unrelated code/formatting. Commit only the allowed hook and this plan's status; return the commit SHA and changed-file list without merging or pushing.

## Boundaries

- Change only `src/hooks/useGameThumbnail.ts` plus this plan's own status if the executor records it; do not edit any other source/config/dependency file.
- Do not change thumbnail selection order, image URLs, video-source URL cleanup, frame timing, JPEG dimensions, slot limits, or the mounted preview cache.
- Do not revoke the generated URL while its card remains mounted; unmount/effect cleanup is the ownership boundary.
- Do not add a dependency, global URL registry, render-phase work, a window/document listener, or a rule suppression.
- The execution base must be refreshed by the orchestrator after authorized dependencies. Stop if unrelated drift from `2dcfc83` is present.

## Verification

The executor skips build, lint, tests, formatters, React Doctor and browser/server launches during concurrent work. The central integrator runs these after all authorized implementations land:

- **Mechanical**:
  - `npx react-doctor@latest --scope changed` and confirm `react-doctor/no-create-object-url-without-revoke` is absent from the changed scope without a score regression.
  - `pnpm build` for TypeScript and production compilation.
  - `pnpm lint` for the changed hook.
  - `pnpm test:run` for the repository's existing Vitest suite. The repository currently has utility-only tests and no DOM hook harness, so do not add a component-test dependency solely for this fix.
- **Behavior check**:
  1. Start the app and select a folder containing a real Switch `.mp4` capture. Instrument `URL.createObjectURL` and `URL.revokeObjectURL` in DevTools before selecting the folder, recording each URL and the input Blob `type`.
  2. Wait for the video frame to become the card's JPEG thumbnail. Confirm the video-source URL is revoked after extraction, while the `image/jpeg` thumbnail URL remains usable while its `GameCard` is mounted.
  3. Switch between the gallery and another gallery tab and confirm the card remains mounted and the thumbnail cache still works; this must not revoke the live thumbnail URL.
  4. Cause that card to unmount by replacing/clearing the selected folder (not merely hiding the gallery). Confirm the recorded `image/jpeg` URL receives one direct `revokeObjectURL` call and is no longer fetchable (`fetch(blobUrl)` rejects after revocation). Repeat once to catch stale callbacks.
  5. Exercise a cancellation race by replacing the folder before `canvas.toBlob` resolves. Confirm no late callback creates an unrevoked JPEG URL and the extraction slot is released. Also exercise an image-only card to confirm the existing image URL path is unchanged.
- **Done when**: the changed-scope diagnostic is clear, build/lint/tests pass, the decoded thumbnail URL is revoked exactly at effect cleanup, late `toBlob` callbacks allocate nothing after cancellation, and mounted thumbnail caching remains intact.
