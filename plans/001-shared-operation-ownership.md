# 001 — Own folder imports and ZIP exports in one lifecycle

- **Status**: TODO
- **Commit**: 2dcfc83d4f0b1ef7189cc8f76e7e0b788f392b9d
- **Severity**: HIGH
- **Category**: Bugs & correctness
- **Rule**: Beyond the scan
- **Estimated scope**: 5 existing source files, one public hook/callback cutover
- **Depends on**: None. May execute alongside 004, 005, 007, and 008.
- **Execution base**: The orchestrator supplies an exact branch/base at launch. A plans-only commit above the audit commit is authorized. Stop for unrelated source drift; do not edit another worktree.

## Problem

The app is React 19.2.3, strict TypeScript, Vite, Tailwind v4. All processing is local to the browser. `App` owns `useScreenshotProcessor`, but folder enumeration happens before that hook knows an operation started.

Current `src/components/FolderInput.tsx:61-80`:

```tsx
const handleDirectoryPicker = async () => {
  loadCaptureIds().catch(() => {});
  let dirHandle: FileSystemDirectoryHandle;
  try {
    dirHandle = await window.showDirectoryPicker();
  } catch {
    // User cancelled the picker
    return;
  }

  fileCountRef.current = 0;
  setFileCount(0);
  setIsReading(true);
  try {
    const files = await collectFilesFromDirectoryHandle(dirHandle, () => {
      fileCountRef.current++;
    });
    if (files.length > 0) {
      onFilesSelected(files);
    }
```

The gallery's download is only `disabled={selectedFileCount === 0}` at `src/App.tsx:284`. `src/hooks/useScreenshotProcessor.ts:47-50` has independent `currentOperationId` and `isProcessing` refs; only scan results check the operation ID. Export completion at lines 234-238 is unconditional:

```tsx
setState((prev) => ({
  ...prev,
  savedFilename: filename,
  status: "done",
}));
```

Verified reproduction: an old 14-file gallery remains downloadable during replacement enumeration. The replacement becomes a one-file gallery, then completion of the old archive switches the screen to Done. The in-memory ZIP central directory still contains 14 entries.

## Target

### One synchronous operation owner

Keep the current view status vocabulary; do not add a `reading` status that would unmount the currently reading FolderInput. Add `isBusy: boolean` to `ScreenshotProcessorState` and its initial/reset values. This is the rendered mirror of one synchronous operation owner, not another independent lock. Remove the old `isProcessing` ref.

Add this exact shared callback contract to `src/types/index.ts`:

```ts
export interface FolderImportOperation {
  complete: (files: File[]) => Promise<void>;
  fail: (message: string) => void;
  cancel: () => void;
}
```

`useScreenshotProcessor` owns the following shape; use stable `useCallback` functions and add `useEffect` for unmount invalidation. `currentOperationId` remains monotonic. `activeOperationId` is the only admission lock:

```tsx
const currentOperationId = useRef(0);
const activeOperationId = useRef<number | null>(null);

const ownsOperation = useCallback(
  (id: number) => activeOperationId.current === id,
  [],
);

const beginOperation = useCallback((): number | null => {
  if (activeOperationId.current !== null) return null;
  const id = ++currentOperationId.current;
  activeOperationId.current = id;
  setState((prev) => ({ ...prev, isBusy: true, error: null }));
  return id;
}, []);

const finishOperation = useCallback((id: number) => {
  if (activeOperationId.current !== id) return;
  activeOperationId.current = null;
  setState((prev) => ({ ...prev, isBusy: false }));
}, []);

useEffect(() => () => {
  currentOperationId.current++;
  activeOperationId.current = null;
}, []);
```

Turn the existing `processFiles` body into an INTERNAL callback accepting `(selectedFiles: File[], operationId: number)`. Do not allocate a new operation inside it. Its existing progress and post-await guards use `ownsOperation(operationId)`. Preserve capture filtering, unknown-name fallback, invalid-date handling, group sorting, and default selection. Every asynchronous mutation must be ownership-checked. Wrap this callback in `useCallback` with `[ownsOperation]` (all other values are stable setters, refs, or module imports).

Expose `beginImport`, not `processFiles` or an unscoped `reportError`, to callers:

```tsx
const beginImport = useCallback((): FolderImportOperation | null => {
  const id = beginOperation();
  if (id === null) return null;
  let settled = false;

  return {
    complete: async (files) => {
      if (settled || !ownsOperation(id)) return;
      settled = true;
      try {
        await processFiles(files, id);
      } catch (error) {
        if (ownsOperation(id)) {
          setState((prev) => ({
            ...prev,
            status: "idle",
            error: error instanceof Error
              ? `Error: ${error.message}`
              : "Couldn't process the selected folder.",
          }));
        }
      } finally {
        finishOperation(id);
      }
    },
    fail: (message) => {
      if (settled || !ownsOperation(id)) return;
      settled = true;
      setState((prev) => ({ ...prev, error: message }));
      finishOperation(id);
    },
    cancel: () => {
      if (settled || !ownsOperation(id)) return;
      settled = true;
      finishOperation(id);
    },
  };
}, [beginOperation, finishOperation, ownsOperation, processFiles]);
```

`complete` marks the reader's handle settled BEFORE scanning starts. A FolderInput unmount caused by that scan must not cancel the handed-off processor operation. Cancellation/failure preserves the previous collection and view. The explicit `reset` operation, if retained, must invalidate the owner (`currentOperationId++`, `activeOperationId = null`) and set `isBusy: false` so late callbacks cannot reinstall results. Do not add a Cancel UI or unrelated features.

### ZIP ownership

`downloadZip` must reject while `activeOperationId.current !== null`, even before React paints disabled controls. Preserve the existing selected-file snapshot and zero-selection return. Acquire an ID with `beginOperation()` before the first await. Capture `const exportCaptureIds = captureIdsRef.current` and the current folder-structure value for this export; do not copy the dictionary or File bytes.

Use the captured dictionary in `parseWithCaptureIds`. Ownership-check progress scheduling/commits, `done`, AbortError recovery, and other errors. In `finally`, cancel any scheduled frame and call `finishOperation(id)`; never clear another operation's owner. Preserve ZIP prewarm, selected-file order, rAF progress throttling, save cancellation behavior, and sequential writer backpressure. Do not modify `src/utils/zip.ts`.

### Clean reader API cutover

In `FolderInputProps`, replace `onFilesSelected` and `onError` with:

```ts
onImportStart: () => FolderImportOperation | null;
```

Import that type using `import type` from `../types`. Keep local enumeration count/visual state. Keep the active reader handle in `useRef<FolderImportOperation | null>(null)`; an unmount cleanup cancels and clears only that reader handle.

Native picker handler ordering is REQUIRED:

1. Call `onImportStart()` synchronously at the beginning; return if it yields null. Store the handle before opening the picker.
2. Start the existing database warmup without awaiting it. Call `window.showDirectoryPicker()` without any intervening await, so browser user activation is preserved.
3. On picker cancellation, call `operation.cancel()` and clear the owned reader ref. On a non-AbortError picker failure, call `operation.fail` with a user-facing read error.
4. Enumerate with the existing function and count updates. Before handing files to the processor, clear local reading state. Await `operation.complete(files)` for nonempty files. For an empty enumeration, use `operation.cancel()` in THIS plan; plan 002 deliberately owns changing empty outcomes.
5. On enumeration failure, use `operation.fail` with the existing folder-read message. Release local reading state/ref in `finally`, but never cancel another handle. Late completion after unmount is harmless because the scoped handle is invalidated.

For the webkitdirectory fallback, acquire/store the operation in `handleFallbackClick` BEFORE calling `input.click()`. The explicit native `cancel` event calls `operation.cancel()`, clears the ref, and preserves existing focus-timer cleanup. The `change` handler consumes the stored handle, stops the reading timer, resets the file input value, and awaits its `complete` for nonempty files. Empty/missing file lists cancel in this plan; plan 002 distinguishes a real empty change from cancel. Clear `dialogOpenRef` on both change and cancel so a later window-focus event cannot restart the reading indicator. Unmount cancels a still-pending picker/read handle.

A busy owner must still be able to receive its hidden file input's change event: do not disable that input merely because the owner made global `isBusy` true. Use `disabled={disabled && operationRef.current === null}` (the visible button remains disabled). Local `showLoading` must represent the active reader's enumeration, not disappear because `disabled` now includes global busy. Set local reading false before `complete` so the existing scanning label can take over.

In `useDropZone`, change its first argument to the same `onImportStart` callback and remove the unscoped `onError` option/ref. Keep `canAcceptDrop` for drag feedback. Store the newest acquisition callback in its existing effect-updated ref. Collect usable entries synchronously from the drop, return for no entries, acquire the operation BEFORE invoking any recursive read, and ignore the event if acquisition returns null. Then enumerate, `complete` nonempty results / `cancel` empty results (002 changes the latter), `fail` using the current dropped-folder message, and clear local indicators in finally. Its cleanup cancels the active reader handle. Do not retain a second independent admission lock that can diverge from processor ownership.

### App callers

Destructure `beginImport` and `isBusy` from the processor, remove `processFiles`/`reportError` uses, and use:

```tsx
const canAcceptDrop = !isBusy;
const { isDragging, isReading: isReadingDrop, fileCount: dropFileCount } =
  useDropZone(beginImport, { canAcceptDrop });
```

All three FolderInput instances use `onImportStart={beginImport}` and `disabled={isBusy}`. The primary download uses `disabled={isBusy || selectedFileCount === 0}`. Disable Back to selection while busy and synchronously ignore its handler if an operation is active. Keep Gallery and FolderStructurePicker props and layout otherwise unchanged; 003 and 006 own their error/recovery markup. Avoid turning `isGalleryView` false merely because enumeration is busy—the old gallery/cache may remain visible but cannot export until the import outcome is known.

## Repo conventions to follow

- Current operation-ID guards in `src/hooks/useScreenshotProcessor.ts:71-100` are the guard exemplar; extend the same ownership discipline to the full lifecycle.
- Existing ref-backed document listeners in `src/hooks/useDropZone.ts:28-39` are the latest-callback exemplar. Do not add listeners on every render.
- Keep `src/utils/zip.ts:243-283` ordered streaming unchanged. No context/provider/state library or dependency additions.
- Run LSP references before modifying exported hook/signature/types and migrate every actual caller. No aliases or deprecated callback compatibility paths.

## Steps

1. Read the allowed files and resolve exported references. Confirm the baseline and no unexpected working-tree changes.
2. Add the `FolderImportOperation` type and single processor admission/ownership lifecycle; change import and export handlers and return surface.
3. Migrate native/fallback FolderInput and useDropZone to scoped operation handles, covering all cancellation/error/unmount paths.
4. Migrate every App caller and busy control. Preserve all other views and domain behavior.
5. Remove the obsolete `isProcessing`, unscoped reader callback/error APIs, and dead refs introduced by the cutover. Do not sweep unrelated unused types or styles.
6. Commit only these allowed files and this plan's status, using a focused commit message. Return commit SHA and changed-file list. Do not merge or push.

## Boundaries

Allowed source files: `src/App.tsx`, `src/hooks/useScreenshotProcessor.ts`, `src/hooks/useDropZone.ts`, `src/components/FolderInput.tsx`, `src/types/index.ts`. Update `src/hooks/index.ts` only if an actual type re-export breaks and report why. No other source files without orchestrator approval. Do not edit plans 002/003/006 or plans/README.md. No empty-folder UX fix in this plan: settle empty reads by cancellation until 002. No gallery retry or error-placement changes. No dependency installs, source formatting sweep, added UI framework, or placeholder code.

Concurrent executor rule: SKIP build, lint, tests, formatters, React Doctor, and browser/server launches while other executors run. The integrator performs required validation on the combined branch. Do not invent forwarding-only or mock-echo tests to cover the new callback type.

## Verification

- **Mechanical, integrator only**: `pnpm build`, `pnpm lint`, `pnpm test:run`; `npx --yes react-doctor@latest --scope changed --base 2dcfc83 --json` and an unfiltered final scan. No new lifecycle diagnostic; full score must not regress from the recorded 42/100 baseline (which includes known .venv noise). Source review must confirm one owner and no old callback callsites.
- **Behavior check**: In Chromium with only generated in-memory File fixtures and mocked native picker/writer boundaries, load 14 captures; start a deferred replacement read; assert Download, all other pickers and drops are denied BEFORE the read completes. Resolve to one capture, then export and inspect ZIP central-directory count = 1. Reverse ordering: delay a writer during export and attempt another import; it must not enumerate or replace state. A double click must create only one owner. Test picker cancel, explicit fallback cancel/change, read rejection, export AbortError and writer rejection, then confirm a subsequent operation succeeds. Do not grant file permissions or write actual user data for these tests.
- **Regression-worthy edge**: Keep the real browser overlapping-import/export reproduction if an existing browser-test seam is available; otherwise use a throwaway browser script and record evidence rather than adding a new test dependency.
- **Done when**: Shared ownership prevents both overlap directions, every failure/cancel releases its own lock, late/unmounted results cannot mutate the active collection, and the integrated checks pass.
