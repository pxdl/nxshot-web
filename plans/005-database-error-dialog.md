# 005 — Make the database error fallback a native modal dialog

- **Status**: IN PROGRESS — pending central QA
- **Commit**: 2dcfc83 (audit baseline; the orchestrator refreshes the execution base after any authorized dependencies)
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Rule**: react-doctor/prefer-html-dialog
- **Dependencies**: None; reuse the existing React hooks, native `<dialog>`, and global backdrop CSS.
- **Estimated scope**: 1 existing source file; native fallback modality only.

## Problem

`src/components/DatabaseInfo.tsx:17-61` renders the database error fallback as a fixed `<div role="alertdialog" aria-modal="true">`. It focuses the Close button once, but it does not establish native modal focus containment or listen for the dialog's cancel event. The verified interaction is: when the fallback is forced, Close receives initial focus, Tab leaves the fallback and reaches the background database footer, and Escape does not dismiss the fallback or invoke `closeDatabase`.

Current fallback:

```tsx
// src/components/DatabaseInfo.tsx:13-61 — current
interface DatabaseErrorFallbackProps {
  onClose: () => void;
}

function DatabaseErrorFallback({ onClose }: DatabaseErrorFallbackProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="database-error-title"
      aria-describedby="database-error-description"
    >
      <div className="w-full max-w-md">
        <Card>
          <div className="flex flex-col gap-4 text-center">
            <h2
              id="database-error-title"
              className="text-xl font-display font-bold text-stone-800 dark:text-slate-200"
            >
              Game database unavailable
            </h2>
            <p
              id="database-error-description"
              className="text-sm text-stone-500 dark:text-slate-400"
            >
              The game database could not be displayed. Your selected files are
              unchanged.
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className={`${buttonBaseStyles} ${buttonVariantStyles.secondary}`}
            >
              Close
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
```

`src/components/DatabaseInfo.tsx:75-78` already owns the correct restoration path:

```tsx
  const closeDatabase = () => {
    setDatabaseOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
```

The fallback is mounted only by the existing error boundary at lines 101-107; keep that boundary and its `onClose={closeDatabase}` contract. Do not change `GameDatabase`, its table, or the normal database modal.

## Canonical rule recipe

Source: <https://www.react.doctor/prompts/rules/react-doctor/prefer-html-dialog.md>.

The canonical fix prompt is:

> Use `<dialog>` with `showModal()` when native modal behavior fits. Preserve accessible naming, an explicit close control, intentional initial focus, Escape and cancel behavior, focus restoration, and any required scroll lock. Verify the full interaction; a tag swap alone is incomplete.

The rule also requires confirming that this is an intended modal: the current lowercase non-`dialog` host has a static dialog role and `aria-modal="true"`; that detector match is present at lines 25-30. This fallback is an actual blocking error state, so native modal behavior fits. Do not disable or suppress the diagnostic, and do not stop at changing the tag name.

## Target

Replace only `DatabaseErrorFallback` at `src/components/DatabaseInfo.tsx:17-61` with this target. `showModal()` supplies top-layer modality, focus containment and the native backdrop; it is not itself a general body-scroll lock. Preserve the existing normal dialog's scroll behavior. React's native `onCancel` prop sees the latest parent callback without a render-phase ref mutation or effect reattachment. The guarded mount effect and cleanup are StrictMode-safe.

```tsx
function DatabaseErrorFallback({ onClose }: DatabaseErrorFallbackProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="database-error-title"
      aria-describedby="database-error-description"
      className="m-auto p-4 bg-transparent border-0 outline-none w-full h-full max-w-none flex items-center justify-center"
    >
      <div className="w-full max-w-md">
        <Card>
          <div className="flex flex-col gap-4 text-center">
            <h2
              id="database-error-title"
              className="text-xl font-display font-bold text-stone-800 dark:text-slate-200"
            >
              Game database unavailable
            </h2>
            <p
              id="database-error-description"
              className="text-sm text-stone-500 dark:text-slate-400"
            >
              The game database could not be displayed. Your selected files are
              unchanged.
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className={`${buttonBaseStyles} ${buttonVariantStyles.secondary}`}
            >
              Close
            </button>
          </div>
        </Card>
      </div>
    </dialog>
  );
}
```

The target retains the `alertdialog` role, accessible title/description IDs, explicit Close control and current copy. `onCancel` prevents a stranded native close and calls `closeDatabase`; that parent's animation-frame callback restores the Browse game database trigger. Effect cleanup only closes the native element, including StrictMode's development cleanup cycle; it never calls the parent.

## Repo conventions to follow

- Imitate the already-shipped native modal in `src/components/GameDatabase.tsx:142-196` and `src/components/GameDatabase.tsx:237-255`: a `dialogRef`, guarded `dialog.showModal()`, explicit initial focus, a `cancel` listener that prevents default while the app owns close behavior, and the transparent full-screen dialog wrapper around a styled inner surface.
- Keep the existing `Card`, `buttonBaseStyles`, `buttonVariantStyles`, title/description copy, IDs, and local Tailwind classes. Do not add a second styling system.
- Preserve the existing parent ownership in `src/components/DatabaseInfo.tsx:63-107`: `closeDatabase` owns state transition and trigger focus, and the `ErrorBoundary` remains unchanged.
- Reuse the global native backdrop styling already present in `src/styles/globals.css:166-175` (`dialog::backdrop` and its optional `data-closing` animation). Do not add a new scrim or edit global CSS for this fallback.

## Steps

1. Confirm the source still matches the audit baseline at `src/components/DatabaseInfo.tsx:13-110`. If unrelated edits are present, stop and report drift rather than merging around them.
2. Add `dialogRef`, retain `closeRef`, and focus Close after the dialog opens. Do not add a latest-callback ref or mutate refs during render.
3. Replace the fixed wrapper `<div>` with the exact native `<dialog>` target. Preserve `role="alertdialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`, the title/description IDs, the explicit Close button, and all visible copy.
4. In the stable mount effect, guard `showModal`, focus Close, and return cleanup that closes an open native dialog. Use React's `onCancel` prop to prevent default and call `onClose`; keep the explicit Close button's `onClick={onClose}`.
5. Leave `closeDatabase`, the ErrorBoundary call site, GameDatabase and global CSS unchanged. Commit only the allowed component and this plan's status; return SHA/changed files without merging or pushing.

## Boundaries

- Change only `src/components/DatabaseInfo.tsx` plus this plan's own status if the executor records it; do not edit `GameDatabase.tsx`, `globals.css`, the error-boundary component, configuration, or dependencies.
- Do not change the normal database modal/table behavior, loading/error content inside `GameDatabase`, trigger copy, database state ownership, or the error boundary's public props.
- Do not add window/document keydown handlers, a custom focus trap, a second scrim, a UI library, or a dependency. Native `showModal()` and the dialog `cancel` event are the focus/keyboard mechanism.
- Do not call `onClose` from effect cleanup; cleanup must only close the native element so StrictMode and unmounts cannot set parent state during teardown.
- The execution base must be refreshed by the orchestrator after authorized dependencies. Stop if unrelated drift from `2dcfc83` is present.

## Verification

The executor skips build, lint, tests, formatters, React Doctor and browser/server launches during concurrent work. The central integrator runs these after all authorized implementations land:

- **Mechanical**:
  - `npx react-doctor@latest --scope changed` and confirm `react-doctor/prefer-html-dialog` is absent from the changed scope without a score regression.
  - `pnpm build` for TypeScript and production compilation.
  - `pnpm lint` for the changed component.
  - `pnpm test:run` for the repository's existing Vitest suite. Add a focused component test only if an existing DOM/browser harness is available; do not add a testing dependency just for this fallback.
- **Behavior check**:
  1. Exercise the existing `ErrorBoundary` fallback with a controlled throwing `GameDatabase` child in a temporary dev/test harness (remove the probe before the final diff; do not alter the production error path). Confirm the native fallback is visible through the dialog top layer and the global `dialog::backdrop` styling is present.
  2. Inspect the browser accessibility tree: the element is an `alertdialog` named by “Game database unavailable” and described by the unchanged paragraph; the explicit Close control is present.
  3. Confirm Close receives focus after `showModal()`. Press Tab repeatedly: focus must remain inside the native dialog and must not reach the background database footer or the Browse game database trigger. With only Close focusable, cycling back to Close is acceptable.
  4. Press Escape. Confirm the `cancel` handler prevents a stranded native close, `closeDatabase` unmounts the fallback, and focus returns on the next animation frame to the “Browse game database” trigger. Click Close and confirm the same restoration path.
  5. Run the app under the existing `StrictMode` entry in `src/main.tsx:7-13`, remount the fallback more than once, and confirm there is no `InvalidStateError`, duplicate cancel callback, or orphaned open dialog after unmount.
- **Done when**: the changed-scope diagnostic is clear, build/lint/tests pass, the fallback has native modal semantics and focus containment, Escape and Close both restore trigger focus through `closeDatabase`, and the normal `GameDatabase` modal/table is unchanged.
