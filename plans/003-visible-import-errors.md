# 003 — Keep shared operation errors visible in every view

- **Status**: TODO
- **Commit**: 2dcfc83d4f0b1ef7189cc8f76e7e0b788f392b9d
- **Severity**: MEDIUM
- **Category**: Bugs & correctness
- **Rule**: Beyond the scan
- **Estimated scope**: 1 existing source file, error-render placement only
- **Depends on**: 001-shared-operation-ownership.md
- **Execution base**: Orchestrator refreshes commit and changed line references after 001. May run alongside 002/009 because their files are distinct. Must land before 006; do not edit App concurrently with 001 or 006.

## Problem

`App` preserves Gallery's mounted state/cache but hides its wrapper outside the ready view. Audit baseline `src/App.tsx:216-222`:

```tsx
{/* Gallery State — kept mounted to preserve thumbnail cache */}
{gameGroups.length > 0 && (
  <div
    className={`w-full max-w-6xl ${isGalleryView ? "animate-fade-up" : "hidden"}`}
    style={isGalleryView ? { animationDelay: "0.1s" } : undefined}
  >
    {error && <ErrorAlert message={error} className="mb-4" />}
```

The other shared-error renderer is inside the idle/scanning card at line 210:

```tsx
{error && <ErrorAlert message={error} />}
```

The Done card at lines 374-417 offers another FolderInput but has no visible error renderer. After an in-memory successful ZIP, a simulated disconnected-card read set the shared error, but the ErrorAlert existed only under the hidden gallery and was absent from `main.innerText`/visible UI. The user still saw Done with no explanation. 001 changes how scoped read failures reach processor error state; it does not fix this placement.

## Target

Render the shared `error` exactly once OUTSIDE status-specific views. Insert the following immediately after the existing header `</div>` at baseline line 172, before the `Idle / Scanning State` comment:

```tsx
{error && (
  <div className={`w-full mb-4 ${isGalleryView ? "max-w-6xl" : "max-w-md"}`}>
    <ErrorAlert message={error} />
  </div>
)}
```

Delete the two old shared-error placements quoted above; do not add another error placement in Done. Keep Gallery's hidden/mounted behavior unchanged. Do not change ErrorAlert itself: `src/components/ErrorAlert.tsx:47-59` already uses `role="alert"`, React-escaped text, correct variant colors and optional children.

Keep the Gallery ErrorBoundary fallback (baseline App lines 224-228) intact: it represents a separate render failure, not the shared operation error. Plan 006 owns that fallback. Do not change warning banners or database modal fallback.

## Repo conventions to follow

- Reuse ErrorAlert and existing Tailwind widths (`max-w-md` for compact states, `max-w-6xl` for gallery), rather than a toast system or CSS file.
- Preserve existing state clearing in processor `beginImport`/export lifecycle from 001. This plan must not alter error state or operation ownership.
- Preserve main/header/idle/gallery/processing/done layout ordering and existing thumbnail-cache comment.

## Steps

1. Confirm 001 is in HEAD; read App's current complete header/status sections and ErrorAlert contract. Run LSP references only if an exported symbol change unexpectedly becomes necessary; no API change is expected.
2. Add the single shared error slot after the header and remove the two status-bound duplicates.
3. Preserve all branch controls and 001's busy gating. Do not reformat unchanged JSX.
4. Commit only App and this plan's status. Return commit SHA and changed files; do not merge or push.

## Boundaries

Allowed source: `src/App.tsx` only. No changes to processor/hooks, error component, other plans or plans/README.md. No new component, abstraction, dependency, dismiss timer, retry button, or wording change. This is error visibility, not an App component-size refactor.

Concurrent executor rule: skip build/lint/tests/formatters/scanners/browser launches. Integrator performs the verification below after merges. Do not add a source-text or copy-assertion test.

## Verification

- **Mechanical, integrator only**: `pnpm build`, `pnpm lint`, `pnpm test:run`; changed React Doctor against `2dcfc83` and final full scan.
- **Behavior check**: Using generated captures and an in-memory writer, complete an export. From Done, choose another folder and reject its enumeration; assert the error is visibly rendered, exposed in the accessibility tree, and not contained by a `display:none` ancestor. Repeat with a failed directory drop. Confirm one visible shared alert, not duplicate announcements. Start a valid read and confirm the old error clears; confirm import/export still work. Exercise empty-folder/unknown-database warnings in idle/ready to ensure moving the renderer did not hide existing outcomes. View compact and gallery errors in light/dark at 390px and desktop widths.
- **Done when**: Every shared operation error has one visible alert independent of the current status, without unmounting Gallery or changing state behavior.
