# 003 — Keep shared operation errors visible in every view

- **Status**: IN PROGRESS (implementation complete; pending central QA)
- **Commit**: 2dcfc83d4f0b1ef7189cc8f76e7e0b788f392b9d
- **Severity**: MEDIUM
- **Category**: Bugs & correctness
- **Rule**: Beyond the scan
- **Estimated scope**: 1 existing source file, error-render placement only
- **Depends on**: 001-shared-operation-ownership.md
- **Verified execution source**: `6d06d8bd447a64c05d65ba4c088c46c303bae8b9` includes integrated 001 (`6e9b909`); App excerpts/lines match it. Independent 004/005/007/008 ancestors are authorized. Launch may use a plans-only descendant. May run alongside 002/009, but before 006; no concurrent App editor.

## Problem

`App` keeps Gallery mounted for caching but hides its wrapper outside ready. Current `src/App.tsx:210-216` after 001:

```tsx
{/* Gallery State — kept mounted to preserve thumbnail cache */}
{gameGroups.length > 0 && (
  <div
    className={`w-full max-w-6xl ${isGalleryView ? "animate-fade-up" : "hidden"}`}
    style={isGalleryView ? { animationDelay: "0.1s" } : undefined}
  >
    {error && <ErrorAlert message={error} className="mb-4" />}
```

The other shared-error renderer is inside the idle/scanning card at `src/App.tsx:204`:

```tsx
{error && <ErrorAlert message={error} />}
```

The current Done card at `src/App.tsx:368-412` offers another FolderInput with no visible error renderer. Audit reproduction completed an in-memory ZIP, then rejected a disconnected-card read: the shared error appeared only under the hidden gallery, not in visible UI. 001 changes scoped read-error ownership, not this placement.

## Target

Render shared `error` exactly once OUTSIDE status views. Insert immediately after the header `</div>` at `src/App.tsx:167`, before the `Idle / Scanning State` comment:

```tsx
{error && (
  <div className={`w-full mb-4 ${isGalleryView ? "max-w-6xl" : "max-w-md"}`}>
    <ErrorAlert message={error} />
  </div>
)}
```

Delete the two old shared-error placements quoted above; do not add another error placement in Done. Keep Gallery's hidden/mounted behavior unchanged. Do not change ErrorAlert itself: `src/components/ErrorAlert.tsx:47-59` already uses `role="alert"`, React-escaped text, correct variant colors and optional children.

Keep the Gallery ErrorBoundary fallback at `src/App.tsx:218-222` intact. It represents a different render failure and belongs to 006. Do not change warning banners or database modality.

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
