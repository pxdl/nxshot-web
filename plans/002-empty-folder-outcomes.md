# 002 — Report an empty folder instead of retaining stale captures

- **Status**: IN PROGRESS (pending central QA)
- **Commit**: 2dcfc83d4f0b1ef7189cc8f76e7e0b788f392b9d
- **Severity**: MEDIUM
- **Category**: Bugs & correctness
- **Rule**: Beyond the scan
- **Estimated scope**: 2 existing source files; remove empty-result bypasses
- **Depends on**: 001-shared-operation-ownership.md
- **Verified execution source**: `6d06d8bd447a64c05d65ba4c088c46c303bae8b9` includes reviewed/integrated 001 (`6e9b909`). Reader excerpts below match it. Plans 004/005/007/008 are authorized independent ancestors. Launch may use the plans-only descendant supplied at dispatch.

## Problem

After 001, native enumeration still cancels its operation for an empty result (`src/components/FolderInput.tsx:93-102`):

```tsx
const files = await collectFilesFromDirectoryHandle(dirHandle, () => {
  if (operationRef.current === operation) fileCountRef.current++;
});
if (operationRef.current !== operation) return;
setIsReading(false);
if (files.length > 0) {
  await operation.complete(files);
} else {
  operation.cancel();
}
```

The fallback (`src/components/FolderInput.tsx:184-195`) conflates a non-null empty FileList with cancellation:

```tsx
const operation = operationRef.current;
operationRef.current = null;
const fileList = event.target.files;
const files = operation && fileList ? Array.from(fileList) : [];
event.target.value = "";

if (operation === null) return;
if (files.length > 0) {
  await operation.complete(files);
} else {
  operation.cancel();
}
```

The dropped-directory completion at `src/hooks/useDropZone.ts:101-110` has the same bypass:

```tsx
const allFiles = (await Promise.all(
  entries.map((entry) => collectFilesFromEntry(entry, onFileFound))
)).flat();
if (operationRef.current !== operation) return;
setIsReading(false);
if (allFiles.length > 0) {
  await operation.complete(allFiles);
} else {
  operation.cancel();
}
```

Verified audit behavior: empty native enumerations show no alert and retain an old collection. The current internal processor at `src/hooks/useScreenshotProcessor.ts:89-116` clears old groups/selection and reports `No Nintendo Switch screenshots found in this folder.` for an empty array, but callers bypass it.

001 replaces the unscoped callbacks with this exact owned-import interface from `src/types/index.ts`:

```ts
export interface FolderImportOperation {
  complete: (files: File[]) => Promise<void>;
  fail: (message: string) => void;
  cancel: () => void;
}
```

Readers acquire a handle through `onImportStart()` before enumeration; 001 deliberately uses `operation.cancel()` for an empty result to keep this outcome change isolated in 002. `complete` holds ownership through processing and finishes the operation in finally. Never bypass that API or restore the old callbacks.

## Target

For a successfully enumerated native directory, always complete, including zero files:

```tsx
const files = await collectFilesFromDirectoryHandle(dirHandle, () => {
  if (operationRef.current === operation) fileCountRef.current++;
});
if (operationRef.current !== operation) return;
setIsReading(false);
await operation.complete(files);
```

Retain 001's existing count resets, scoped ref clearing, catch/finally, and ownership checks around that block; do not retype or duplicate surrounding cleanup. Remove only the nonempty guard/empty cancellation branch.

For a dropped directory, always complete the collected array:

```tsx
const allFiles = (await Promise.all(
  entries.map((entry) => collectFilesFromEntry(entry, onFileFound))
)).flat();
if (operationRef.current !== operation) return;
setIsReading(false);
await operation.complete(allFiles);
```

Preserve the no-usable-entry early return for non-file drops. A drop containing an actual empty directory entry has a usable entry, so it must reach `complete([])`.

For the fallback input, a real `change` event with a non-null FileList is a selection outcome even if its length is zero. Its owned operation must receive `Array.from(fileList)` without a length guard. A missing FileList is not a selection and must cancel/release the operation. Keep 001's explicit `cancel` event path silent and distinct:

```tsx
const handleFallbackChange = async (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  dialogOpenRef.current = false;
  clearTimeout(focusTimerRef.current);
  setIsReading(false);

  const operation = operationRef.current;
  operationRef.current = null;
  const fileList = event.target.files;
  const files = operation && fileList ? Array.from(fileList) : null;
  event.target.value = "";

  if (operation === null) return;
  if (files === null) {
    operation.cancel();
    return;
  }
  await operation.complete(files);
};
```

Snapshot the FileList before clearing the input value, as shown. Preserve the explicit cancel handler and focus-timer cleanup so a later window focus cannot restart Reading. Do not infer empty selections from focus/timeouts: if a browser emits only cancel, there is no reliable empty-selection signal, and explicit cancellation must remain silent.

The processor's existing empty-capture message and group/selection reset are the canonical repo behavior. Do not add a second empty-folder message or move this domain check into a new helper. After empty completion, `status` must be idle, old groups and selections must be gone, and `isBusy` must be false. Nonempty folders containing no valid captures continue through the same existing processor behavior.

## Repo conventions to follow

- Existing processor empty-input branch: `src/hooks/useScreenshotProcessor.ts:89-116` in 001's verified dependency source.
- Scoped operation complete/cancel/fail contract introduced by 001; retain synchronous admission and operation-specific cleanup.
- Use current user-facing ErrorAlert path. 003 independently improves error placement; this plan does not edit App.
- Keep TypeScript type imports and current native/fallback feature detection.

## Steps

1. Confirm 001 is in HEAD and inspect its reader signatures/cancellation paths. Stop if they differ semantically from the contract above; do not revert ownership changes.
2. Remove native and drop empty-result cancellation bypasses and always await completion after successful enumeration.
3. In the fallback change handler, distinguish non-null empty FileList from the explicit cancel event; preserve all teardown/value-reset paths.
4. Confirm no new message, duplicated validation, callback alias, or non-file-drop behavior was introduced.
5. Commit only the two allowed source files and this plan's status. Return commit SHA, changed files, and unrun verification. Do not merge or push.

## Boundaries

Allowed: `src/components/FolderInput.tsx`, `src/hooks/useDropZone.ts`, and this plan's status. Do not modify App, the processor, shared types, other plans, README, package/config files or dependencies. If the processor's empty handling regressed under 001, report that dependency issue to the orchestrator instead of expanding ownership.

Concurrent executor rule: skip build, lint, tests, formatters, React Doctor and browser/server launches; the integrator runs combined validation once. No new test dependency or forwarding-only unit test.

## Verification

- **Mechanical, integrator only**: `pnpm build`, `pnpm lint`, `pnpm test:run`; changed-scope React Doctor against `2dcfc83` plus final full scan without score regression. This finding is beyond the scanner, so the behavioral checks are decisive.
- **Behavior check**: Native empty folder on idle yields a visible `role=alert` and no gallery. Load 14 captures, choose an empty replacement, and confirm old cards/selection/download disappear, a clear empty message appears, busy releases, and a subsequent valid folder works. Repeat with a dropped empty directory. In a separate page with native directory-picker support absent before App loads, dispatch a real input change with an empty FileList and verify the same outcome. Explicit input cancel and native AbortError must preserve the old collection, remain silent, and release busy. Also verify a non-file drop has no effect.
- **Reproduction policy**: Use in-memory directory handles/File objects only. Keep an existing browser regression seam if available; otherwise use a throwaway scenario, not a test that asserts callback forwarding.
- **Done when**: Empty selections have explicit outcomes on supported event paths, cancel remains silent, stale groups are never presented as the selected empty collection, and all locks release.
