# 006 — Offer real recovery after the gallery chunk fails

- **Status**: TODO
- **Commit**: 2dcfc83d4f0b1ef7189cc8f76e7e0b788f392b9d
- **Severity**: MEDIUM
- **Category**: Bugs & correctness
- **Rule**: Beyond the scan
- **Estimated scope**: 1 existing source file, gallery fallback only
- **Depends on**: 003-visible-import-errors.md (and therefore 001)
- **Execution base**: Orchestrator refreshes exact base and source line references after 003. Never run concurrently with another App editor. Other completed non-App plans are authorized ancestors.

## Problem

The Gallery component is a module-scope React lazy value in `src/App.tsx:24-26`:

```tsx
const Gallery = lazy(() =>
  import("./components/Gallery").then((m) => ({ default: m.Gallery }))
);
```

Its ErrorBoundary fallback at baseline lines 224-228 promises an ineffective recovery:

```tsx
<ErrorBoundary
  fallback={
    <ErrorAlert message="Something went wrong loading the gallery. Your files are safe — try selecting your folder again." />
  }
>
```

React.lazy caches the rejected loader result. Browser verification blocked the Gallery module request, selected a generated capture folder, restored the network, and selected the folder again. The same fallback remained; reselecting does not reset the module-scope lazy promise.

## Target

Use an explicit USER-INITIATED page reload recovery, consistent with the existing root ErrorBoundary. Do not invent an import cache-busting/retry layer, automatically reload, or promise preservation of in-memory File selections across reload. The UI must say that the folder needs to be selected again. This is the deliberately chosen reliable recovery for a cached module load failure.

Replace only the fallback prop above with:

```tsx
<ErrorBoundary
  fallback={
    <div className="space-y-3">
      <ErrorAlert>
        <p className="font-semibold">The gallery could not be loaded.</p>
        <p className="mt-1">
          Your files are unchanged. Reload this page, then select your folder again.
        </p>
      </ErrorAlert>
      <Button
        onClick={() => window.location.reload()}
        variant="secondary"
      >
        Reload page
      </Button>
    </div>
  }
>
```

Keep the existing lazy import, Suspense fallback, Gallery props, shared operation error slot from 003, and file/export controls unchanged. Keep the root ErrorBoundary component unchanged. The Reload page button is shown only inside this failure fallback, never on ordinary Gallery loading or ready states. Reload is not automatic and does not write or delete user files.

## Repo conventions to follow

- `src/components/ErrorBoundary.tsx:60-73` already uses an explicit `window.location.reload()` control for fatal render recovery. Reuse that recovery mechanism, not a new retry library.
- App already imports Button and ErrorAlert. Button's secondary variant and ErrorAlert children are used elsewhere in App. No new import is needed.
- ErrorAlert is a live `role=alert`; preserve that semantics and a native keyboard-operable Button.

## Steps

1. Verify 003 is in HEAD and read App's current Gallery boundary plus Button/ErrorAlert APIs. The orchestrator must refresh this plan's execution-base stamp and moved lines before launch.
2. Replace the ineffective fallback with the exact explicit recovery above. Keep surrounding JSX and branches unchanged.
3. Confirm there is no remaining instruction in this gallery fallback to reselect the folder WITHOUT first reloading, and no automatic reload.
4. Commit only App and this plan's status. Return commit SHA and changed files; do not merge or push.

## Boundaries

Allowed source: `src/App.tsx` only. Do not alter ErrorBoundary's public API, other fallback consumers, processor ownership, database modal, build output, caching configuration, dependencies, or other plans/README. Do not add tests that pin wording or source text. Behavior changes are limited to a working action for the existing failure state.

Concurrent executor rule: skip build/lint/tests/formatters/scanners/browser/server launches; the integrator runs all verification after the dependent merge.

## Verification

- **Mechanical, integrator only**: `pnpm build`, `pnpm lint`, `pnpm test:run`; React Doctor changed scope against `2dcfc83` and full scan with no score regression.
- **Behavior check**: Start the real app in a dedicated Chromium tab. Intercept/block only the Gallery chunk (development `/src/components/Gallery.tsx`, or the identified production Gallery chunk). Supply generated local capture fixtures; observe the error and Reload page control. Restore the resource BEFORE activating Reload page. Click the control and verify a real document reload, the idle folder picker, and a successful Gallery mount after selecting fixtures again. Verify no reload occurs merely from the failure or from keyboard focus. Check Tab/Enter activation and narrow/light/dark rendering. Use no real file writes or permissions.
- **Done when**: The rendered recovery action really restores a loadable app after the resource returns, clearly communicates reselection, and ordinary loading/export flows remain unchanged.
