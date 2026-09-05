# 009 — Disclose complete game names and capture IDs from every database row

- **Status**: IN PROGRESS — implemented; pending central QA.
- **Commit**: `2dcfc83d4f0b1ef7189cc8f76e7e0b788f392b9d` (audit baseline)
- **Verified source base**: `0e3c5a5d39cf7f12cdd4ae66304a102e39718ac9` — 007 integrated; excerpts below refreshed. Launch may use a plans-only descendant supplied by the orchestrator.
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Rule**: Beyond the scan — accessible disclosure for clipped table values
- **Estimated scope**: 1 source file (`src/components/GameDatabase.tsx`), approximately 100 lines changed
- **Dependency**: **007 — database table semantics** MUST be integrated first. This plan changes the game-name cell inside 007's role-table markup and must never be executed concurrently with 007.

> **Execution-base gate satisfied.** Main integrated 007 (`e28b2eb`) and refreshed the affected excerpts against `0e3c5a5`. Plans 004/005/008 are also integrated in that ancestor and are authorized independent changes. Source lines below refer to this verified tree; the exact launch commit may add only updated plans. Stop only for unrelated source drift. This executor owns the listed source file; Main performs centralized validation.

## Problem

At the verified execution base, the game-name column exposes a raw string and the capture-ID column truncates its value on narrow widths. `src/components/GameDatabase.tsx:198-217` is unchanged by 007:

```tsx
// src/components/GameDatabase.tsx:198-217 — current at verified execution base
  const columns = useMemo(
    () => [
      columnHelper.accessor("gameName", {
        header: "Game Name",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("captureId", {
        header: "Capture ID",
        cell: (info) => (
          <span className="flex items-center gap-1.5">
            <code className="text-xs font-mono text-stone-500 dark:text-slate-400 select-all truncate max-w-[100px] sm:max-w-[200px] md:max-w-none">
              {info.getValue()}
            </code>
            <CopyButton text={info.getValue()} />
          </span>
        ),
      }),
    ],
    [],
  );
```

The current semantic row cell at `src/components/GameDatabase.tsx:405-420` still applies `truncate` to the game-name value. At 390px, long regional title variants and 32-character IDs are clipped. Selection and Copy can extract the full underlying text, but neither provides a visible keyboard/touch expanded reading surface.

```tsx
// src/components/GameDatabase.tsx:405-420 — current after plan 007
                          {row.getVisibleCells().map((cell) => (
                            <div
                              key={cell.id}
                              role="cell"
                              className={`min-w-0 px-4 md:px-6 ${
                                cell.column.id === "gameName"
                                  ? "text-sm text-stone-800 dark:text-slate-200 truncate"
                                  : "flex justify-end"
                              }`}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </div>
                          ))}
```

The existing source modal at `src/components/GameDatabase.tsx:238-253` owns search, sorting, virtual rows, and the source footer. Preserve it. Render the new details dialog as its sibling, outside both that native dialog and 007's role-table content.

```tsx
// src/components/GameDatabase.tsx:238-253 — current source dialog
  return (
    <dialog
      ref={dialogRef}
      data-closing={isClosing ? "true" : undefined}
      aria-labelledby="game-database-title"
      onMouseDown={(e) => {
        backdropDownRef.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (backdropDownRef.current && e.target === e.currentTarget) {
          handleClose();
        }
        backdropDownRef.current = false;
      }}
      className="m-auto p-4 bg-transparent border-0 outline-none w-full h-full max-w-none flex items-center justify-center"
    >
```

## Target

Keep the source dialog, table semantics from plan 007, TanStack sorting/filtering, `ROW_HEIGHT = 44`, virtualizer overscan, footer, and current CopyButton implementation. Add one keyboard/touch control in the game-name cell and one module-scope native details component. Do not wrap table rows, do not put a raw click handler on a row, and do not use a title-only/hover-only tooltip.

### 1. Add the module-scope native details dialog

Insert the interface immediately after `GameEntry`, and the module-scope component after `CopyButton`, before `const CLOSE_DURATION`. `useEffect`, `useRef`, `XMarkIcon`, and CopyButton already exist. Add `import { Button } from "./Button";` for the existing secondary button convention (use the LSP import code action when available).

```tsx
interface GameEntryDetailsProps {
  entry: GameEntry | null;
  onClose: () => void;
}
```

```tsx
function GameEntryDetails({
  entry,
  onClose,
}: GameEntryDetailsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !entry) return;
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, [entry]);

  if (!entry) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="game-entry-details-title"
      aria-describedby="game-entry-details-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto p-4 bg-transparent border-0 outline-none w-full h-full max-w-none flex items-center justify-center"
    >
      <div className="w-full max-w-md max-h-full overflow-y-auto overscroll-contain bg-white dark:bg-[#161b22] rounded-2xl border border-stone-200/80 dark:border-slate-700/50 shadow-2xl dark:shadow-black/50 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="game-entry-details-title"
            className="text-xl font-display font-bold text-stone-800 dark:text-slate-200"
          >
            Game entry details
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close game entry details"
          >
            <XMarkIcon className="w-5 h-5 text-stone-500 dark:text-slate-400" />
          </button>
        </div>

        <p
          id="game-entry-details-description"
          className="sr-only"
        >
          Full game name and capture ID for the selected entry.
        </p>

        <dl className="space-y-4 text-base">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-slate-400">
              Game Name
            </dt>
            <dd className="mt-1 whitespace-normal break-words text-stone-800 dark:text-slate-200">
              {entry.gameName}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-slate-400">
              Capture ID
            </dt>
            <dd className="mt-1 flex items-start gap-1.5">
              <code className="min-w-0 flex-1 break-all select-all text-sm font-mono text-stone-500 dark:text-slate-400">
                {entry.captureId}
              </code>
              <CopyButton text={entry.captureId} />
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </div>
    </dialog>
  );
}
```

`showModal()` supplies native top-layer modality, focus containment and Escape-to-cancel behavior, not a general body-scroll lock. The cancel handler prevents immediate native close so React can clear selection; cleanup closes the element. The bounded, scrollable surface keeps long names/IDs and close controls reachable at short viewports and zoom. Full text wraps without truncation; the ID is selectable and break-all. Reuse Button rather than styling a second primary/secondary button convention.

### 2. Own the selected entry and invoking control in `GameDatabase`

At the state/ref cluster currently beginning at `src/components/GameDatabase.tsx:139`, add the selected entry state and trigger ref exactly as follows. Keep the existing refs; `detailsTriggerRef` must be a separate ref because the virtualizer can unmount a row while the details dialog is open.

```tsx
  const [showInfo, setShowInfo] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<GameEntry | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const detailsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closingRef = useRef(false);
```

Immediately after the existing `handleClose` callback (currently `src/components/GameDatabase.tsx:149-157`, after Main refreshes the line), add these exact stable callbacks:

```tsx
  const openDetails = useCallback(
    (entry: GameEntry, trigger: HTMLButtonElement) => {
      detailsTriggerRef.current = trigger;
      setSelectedEntry(entry);
    },
    [],
  );

  const closeDetails = useCallback(() => {
    const trigger = detailsTriggerRef.current;
    detailsTriggerRef.current = null;
    setSelectedEntry(null);
    requestAnimationFrame(() => {
      if (trigger?.isConnected) {
        trigger.focus();
      } else {
        searchRef.current?.focus();
      }
    });
  }, []);
```

`openDetails` is stable and is the only new value consumed by the memoized columns. `closeDetails` snapshots the invoking control before clearing the selection, then restores focus after React removes the sibling dialog. It deliberately tests `isConnected`: sorting, filtering, scrolling, or virtualization may have removed that exact button, in which case the main database search input is the safe fallback.

### 3. Make the name-cell disclosure button part of the memoized columns

Replace the current `columns` block with this exact block. The entire game-name label is a keyboard/touch disclosure button, with an information icon cue. This leaves more room for the title than a separate 44px icon beside it. Keep the capture-ID cell and CopyButton; the dependency array becomes `[openDetails]`.

```tsx
  const columns = useMemo(
    () => [
      columnHelper.accessor("gameName", {
        header: "Game Name",
        cell: (info) => (
          <button
            type="button"
            onClick={(event) => {
              openDetails(info.row.original, event.currentTarget);
            }}
            className="flex min-h-11 min-w-11 w-full items-center gap-2 rounded-lg text-left hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={`Show full details for ${info.getValue()}`}
          >
            <span className="min-w-0 flex-1 truncate">{info.getValue()}</span>
            <InformationCircleIcon
              aria-hidden="true"
              className="w-4 h-4 shrink-0 text-stone-500 dark:text-slate-400"
            />
          </button>
        ),
      }),
      columnHelper.accessor("captureId", {
        header: "Capture ID",
        cell: (info) => (
          <span className="flex items-center gap-1.5">
            <code className="text-xs font-mono text-stone-500 dark:text-slate-400 select-all truncate max-w-[100px] sm:max-w-[200px] md:max-w-none">
              {info.getValue()}
            </code>
            <CopyButton text={info.getValue()} />
          </span>
        ),
      }),
    ],
    [openDetails],
  );
```

The button has a programmatic accessible name and a 44×44px hit area, so it works with keyboard focus, Enter/Space, and touch. There is intentionally no `title` tooltip and no row-level `onClick`; the row remains read-only and sorting remains owned by the existing header buttons.

### 4. Remove only the outer game-name truncation and render the sibling dialog

After plan 007, the row cell wrapper has `role="cell"` and `min-w-0`. In that exact post-007 block, change only the game-name branch so truncation is owned by the inner text span above, not by the cell wrapper. The target cell wrapper is:

```tsx
                            <div
                              key={cell.id}
                              role="cell"
                              className={`min-w-0 px-4 md:px-6 ${
                                cell.column.id === "gameName"
                                  ? "text-sm text-stone-800 dark:text-slate-200"
                                  : "flex justify-end"
                              }`}
                            >
```

Do not remove `min-w-0`, `role="cell"`, the `grid-cols-[1fr_auto]` row layout, or the 44px virtual row style. The inner `truncate` span keeps the row compact at exactly the existing row height; the dialog is the complete-value surface.

At the return boundary, wrap the existing source `<dialog>` in a fragment and render `GameEntryDetails` as its sibling after the source dialog closes. The beginning must become:

```tsx
  return (
    <>
      <dialog
        ref={dialogRef}
        data-closing={isClosing ? "true" : undefined}
        aria-labelledby="game-database-title"
```

Keep existing source-dialog children, including the role-table and footer, unchanged. At `src/components/GameDatabase.tsx:494-495`, close the source dialog first, then add the sibling component:

```tsx
      </dialog>
      <GameEntryDetails
        entry={selectedEntry}
        onClose={closeDetails}
      />
    </>
  );
}
```

This placement keeps the details dialog outside the source dialog's `role="table"` content and outside its table footer. Because the sibling calls `showModal()` while the source dialog is already modal, the browser's top-layer stack places the details dialog above the source dialog; its backdrop and focus trap apply to the topmost dialog, and Escape is delivered to its `cancel` handler first. Closing it removes only the selected-entry dialog and returns the user to the invoking row control when that DOM node is still connected, or to the source dialog's search input when virtualization/filtering removed it. No hand-rolled scrim, global focus listener, or nested raw row click is needed.

## Repo conventions to follow

- Keep the existing module-scope `CopyButton` pattern at `src/components/GameDatabase.tsx:46-92`: local state/timers live inside the small component, clipboard failures are caught, and the native button carries an accessible label. Reuse that component unchanged for the full capture ID; do not duplicate clipboard logic.
- Keep native modal behavior consistent with the source dialog's `showModal()` effect and `cancel` listener at `src/components/GameDatabase.tsx:176-196`. The details component may use its inline `onCancel` handler because it has no exit animation; it must still prevent the native default and close itself during cleanup.
- Keep Tailwind, the existing light/dark palette and modal surfaces. Follow the explicit animation-frame focus return in this file's target `closeDetails` and the existing `DatabaseInfo.closeDatabase` convention, adding the captured-trigger `isConnected` fallback required for virtualization.
- Keep `useMemo` dependencies honest: `columns` must depend on `[openDetails]`; `openDetails` and `closeDetails` must each use `[]` because they only use stable setters/refs. Do not silence a hook diagnostic or move selected-entry state into a module variable.
- Keep the plan-007 semantic table contract: two columns, rowgroups, `aria-sort`, stable `captureId` row IDs, `aria-rowcount={rows.length + 1}`, and the footer outside the table. The sibling details dialog must never be a table row or cell.

## Steps

1. Wait for plan 007 to be integrated. Main then re-reads `src/components/GameDatabase.tsx`, refreshes this plan's commit/excerpts, and confirms the source has the role-table wrapper and `role="cell"` target shown above. Stop for unrelated drift.
2. Add `GameEntryDetailsProps` and the module-scope `GameEntryDetails` component exactly as specified. Use `showModal()`, native `cancel`/Escape, explicit `Close`, `aria-labelledby`, `aria-describedby`, full-value wrapping, complete `break-all select-all` ID text, and effect cleanup.
3. Add `selectedEntry` and `detailsTriggerRef` to `GameDatabase`, then add the stable `openDetails` and `closeDetails` callbacks. Keep focus restoration asynchronous and fallback to `searchRef` only when the captured trigger is disconnected.
4. Replace the memoized columns block exactly. Put the disclosure button in the game-name cell, pass `info.row.original` and `event.currentTarget` to `openDetails`, retain the capture-ID CopyButton, and set the dependency array to `[openDetails]`.
5. In the plan-007 row cell wrapper, remove only the outer game-name `truncate` utility; leave the inner name span truncated so rows remain fixed at 44px. Do not wrap row content or add a click handler to the row.
6. Wrap the existing source dialog in a fragment and render `GameEntryDetails` after `</dialog>` as a sibling. Confirm the details dialog is outside role-table content and no source-dialog sorting/search/footer markup moved.
7. Keep the changes scoped with no dependencies, CSS files, test scaffolding, global listeners, or hover-only disclosure. Commit the allowed source and this plan's status; return SHA/changed files without merging or pushing.

## Boundaries

- Scope allowance: only `src/components/GameDatabase.tsx` and this plan's `Status` line may change for this plan. Do not edit `plans/README.md`, plan 007, `DatabaseInfo.tsx`, styles, dependencies, or unrelated source.
- This plan is serial after 007. Main MUST refresh the execution base and excerpts after 007 and dispatch this same-file plan alone; never run executors for 007 and 009 concurrently.
- Do not change the `GameDatabase` public props, `GameEntry` shape, table columns/count, TanStack sort/filter behavior, stable `captureId` row IDs, virtualizer count/overscan, `ROW_HEIGHT = 44`, source dialog close animation, source footer, or CopyButton implementation.
- Do not solve the issue by wrapping table rows, making the row clickable, adding nested raw row clicks, using a title-only/hover-only tooltip, or exposing only a copied value. The disclosure button must be a real native button reachable by keyboard and touch.
- Do not add a custom focus trap, document-level Escape listener, manual backdrop, or modal dependency. Native `showModal()` plus the details `cancel` handler and cleanup are the required modal mechanism.
- The details dialog must be rendered as a sibling of the existing source dialog and outside the plan-007 `role="table"` subtree. Its selected entry belongs to `GameDatabase`; no module-global mutable selection is allowed.

## Verification

Main performs this once after plans 007 and 009, plus the remaining authorized plans, are integrated; the serial executor does not run validation during the concurrent wave.

- **Mechanical**:
  - `npx react-doctor@latest --scope changed` clears the targeted diagnostic and the score does not regress.
  - `pnpm build`
  - `pnpm lint`
  - `pnpm test:run`
  - Do not add a permanent component test solely to pin JSX or class strings: the repository's existing permanent tests are utility-focused. If an existing browser harness is available, keep a focused regression for the observable disclosure/focus contract below, not implementation details.

- **Browser/AX behavior** (exercise the real Vite UI at 390px and a desktop width):
  1. Open the app, activate “Browse game database,” wait for the native source dialog, and confirm the plan-007 table remains a named two-column read-only table with the expected `aria-rowcount`, rowgroups, sort metadata, and 44px virtual rows before opening details.
  2. At a 390px viewport, locate a long regional-title row (use a loaded entry whose name is visibly ellipsized). Confirm the row remains one 44px row with its inner name clipped, but a real game-name-cell button with accessible name `Show full details for <full game name>` is visible, focusable, and has at least a 44×44px hit area. Confirm no row itself is a button/click target and no hover-only tooltip is required.
  3. Activate that details button with a pointer/touch click. Confirm a second native dialog appears above the source dialog, has accessible name “Game entry details,” is exposed as modal in the browser AX tree, and contains the complete game name with wrapping (no `truncate`, `nowrap`, or clipping) and the complete capture ID with `break-all` wrapping and selectable text. Confirm the existing Copy capture ID button remains present and reports its normal copied/failed feedback when used.
  4. With keyboard only, tab to the details button and press Enter/Space. Confirm the same dialog opens, initial focus lands inside the details dialog on its Close control, Tab/Shift+Tab do not escape the native modal while it is open, and pressing Escape invokes the details cancel path and closes only the details dialog. Confirm the source database dialog, search value, sorting state, virtual scroll position, and footer remain intact underneath.
  5. Re-open details, activate the visible text `Close` button, and assert focus returns to the exact invoking row control when that button is still connected. Re-open details, then change the source search/filter or scroll/sort enough to virtualize that row away while the details dialog is open; close with Escape or `Close` and assert focus falls back to the main database search input, not a disconnected node or the page body.
  6. While details is open, verify both dialogs remain in the native top-layer stack, but only the topmost details dialog is active and focusable. One Escape closes details only; the next Escape reaches the source dialog's cancel/exit animation. Keep both dialogs outside table row content, with unchanged table row counts and indices.
  7. Repeat with a long capture ID on 390px and desktop widths. Confirm every character is reachable by selection/copy, lines break within the dialog instead of widening the viewport, the CopyButton operates on the full ID, and no horizontal page overflow or row-height change occurs. Verify plan-007 sort buttons still work after returning from the dialog and scrolling still mounts rows with the correct virtual `aria-rowindex` values.

- **Focused regression target** (only if an existing browser/component harness is already configured): assert the complete user contract in one scenario—open a long-name row's keyboard/touch disclosure, observe full text plus modal semantics, exercise Escape/explicit Close, and verify connected-trigger versus disconnected-trigger focus restoration. Do not assert source strings, implementation hook names, or mere element counts.

- **Done when**: the centralized mechanical checks pass; a 390px keyboard/touch user can discover and read every full game name and capture ID through the accessible details dialog; native modal stacking, Escape, focus restoration/fallback, CopyButton feedback, 44px virtualization, table sorting/search, and row semantics remain correct.
