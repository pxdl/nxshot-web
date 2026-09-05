# 007 — Give the virtualized game database read-only table semantics

- **Status**: TODO
- **Commit**: `2dcfc83d4f0b1ef7189cc8f76e7e0b788f392b9d` (audit baseline)
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Rule**: Beyond the scan — semantic table metadata for a virtualized read-only table
- **Estimated scope**: 1 source file (`src/components/GameDatabase.tsx`), approximately 70 lines changed
- **Dependency**: None. Plan 009 MUST execute only after this plan is integrated; it consumes the stable row/table interface added here.

> **Execution-base gate.** The commit above is the audit snapshot, not a permission to apply stale line numbers. Before dispatch, Main MUST refresh the execution-base commit and every source excerpt/line reference against the current `src/components/GameDatabase.tsx`. Stop on unrelated source drift instead of merging around it. Executors in the concurrent wave do not run formatters, scanners, builds, lint, or tests; Main runs the centralized verification after all authorized plans land.

## Problem

`src/components/GameDatabase.tsx:219-226` configures TanStack Table without a stable row identity and the visible table is currently only a set of styled `div`s. Sorting and filtering can therefore change TanStack's default index-based row IDs, while assistive technology receives no table, row, cell, column-header, sort-state, or total-row metadata.

```tsx
// src/components/GameDatabase.tsx:219-226 — current
  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: coreRowModel,
    getSortedRowModel: sortedRowModel,
  });
```

`src/components/GameDatabase.tsx:310-341` renders the headers as an unlabelled CSS grid. The sort buttons remain usable to a sighted pointer/keyboard user, but their parent has no `columnheader` role and no `aria-sort` state.

```tsx
// src/components/GameDatabase.tsx:310-341 — current
            {/* Column headers */}
            <div className="shrink-0 grid grid-cols-[1fr_auto] border-b border-stone-200 dark:border-slate-700/50 bg-stone-50 dark:bg-[#0d1117]/50">
              {table.getHeaderGroups().map((headerGroup) =>
                headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <button
                      key={header.id}
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className={`flex items-center gap-1.5 px-4 md:px-6 py-3 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-slate-400 hover:text-stone-700 dark:hover:text-slate-300 transition-colors cursor-pointer ${
                        header.id === "captureId"
                          ? "text-right justify-end"
                          : "text-left"
                      }`}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {sorted === "asc" ? (
                        <ChevronUpIcon className="w-3.5 h-3.5" />
                      ) : sorted === "desc" ? (
                        <ChevronDownIcon className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronUpDownIcon className="w-3.5 h-3.5 opacity-30" />
                      )}
                    </button>
                  );
                }),
              )}
            </div>
```

`src/components/GameDatabase.tsx:343-385` has the same problem for the body: the scroll element and height spacer are anonymous `div`s, and each absolutely positioned virtual row/cell lacks an accessibility role or row index. The footer at `src/components/GameDatabase.tsx:387-448` is metadata and controls, not table content; putting it inside a table role would cause screen readers to announce “Sources” and the count as a table row/cell.

```tsx
// src/components/GameDatabase.tsx:343-385 — current
            {/* Virtualized rows */}
            <div ref={parentRef} className="flex-1 overflow-auto">
              {rows.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-stone-500 dark:text-slate-400 text-sm">
                  No games found matching &ldquo;{globalFilter}&rdquo;
                </div>
              ) : (
                <div
                  style={{ height: `${virtualizer.getTotalSize()}px` }}
                  className="relative w-full"
                >
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index]!;
                    return (
                      <div
                        key={row.id}
                        className="absolute top-0 left-0 w-full grid grid-cols-[1fr_auto] items-center border-b border-stone-100 dark:border-slate-800/50 hover:bg-stone-50 dark:hover:bg-slate-800/30 transition-colors"
                        style={{
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <div
                            key={cell.id}
                            className={`px-4 md:px-6 ${
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
```

This is a read-only data table, not an interactive grid. Without the semantics, a screen-reader user cannot discover that the two controls sort columns, which row is currently being announced after virtual scrolling, or how many filtered rows exist.

## Target

Keep the existing imports, `GameEntry` shape, `ROW_HEIGHT = 44`, `useDeferredValue` filtering, TanStack sorting, virtualizer, footer, and modal behavior. Do not add a `role="grid"`, `tabIndex`, row focus, roving keyboard model, or custom key handlers.

### 1. Give TanStack rows a capture-ID identity

At the current `useReactTable` call (`src/components/GameDatabase.tsx:219` after Main refreshes the line), use this exact configuration. `captureId` is the data's unique key and remains stable across filtering and sorting.

```tsx
  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: coreRowModel,
    getSortedRowModel: sortedRowModel,
    getRowId: (row) => row.captureId,
  });
```

### 2. Wrap only the header and scrollable body in a named table

Replace the current header and virtualized-row block (`src/components/GameDatabase.tsx:310-385` at the audit baseline) with the following exact JSX. The `role="table"` wrapper is a flex child with `min-h-0`; the scroll element remains the flex-growing overflow container. The `aria-rowcount` is the filtered/sorted row model count plus the one header row. The footer stays immediately after the closing `</div>` shown below, outside the table role.

```tsx
            <div
              role="table"
              aria-labelledby="game-database-title"
              aria-colcount={2}
              aria-rowcount={rows.length + 1}
              className="flex-1 min-h-0 flex flex-col"
            >
              {/* Column headers */}
              <div
                role="rowgroup"
                className="shrink-0 border-b border-stone-200 dark:border-slate-700/50 bg-stone-50 dark:bg-[#0d1117]/50"
              >
                {table.getHeaderGroups().map((headerGroup) => (
                  <div
                    key={headerGroup.id}
                    role="row"
                    aria-rowindex={1}
                    className="grid grid-cols-[1fr_auto]"
                  >
                    {headerGroup.headers.map((header) => {
                      const sorted = header.column.getIsSorted();
                      const ariaSort =
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : "none";
                      return (
                        <div
                          key={header.id}
                          role="columnheader"
                          aria-sort={ariaSort}
                          className="min-w-0"
                        >
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className={`w-full flex items-center gap-1.5 px-4 md:px-6 py-3 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-slate-400 hover:text-stone-700 dark:hover:text-slate-300 transition-colors cursor-pointer ${
                              header.id === "captureId"
                                ? "text-right justify-end"
                                : "text-left"
                            }`}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {sorted === "asc" ? (
                              <ChevronUpIcon className="w-3.5 h-3.5" />
                            ) : sorted === "desc" ? (
                              <ChevronDownIcon className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronUpDownIcon className="w-3.5 h-3.5 opacity-30" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Virtualized rows */}
              <div
                ref={parentRef}
                role="rowgroup"
                className="min-h-0 flex-1 overflow-auto"
              >
                {rows.length === 0 ? (
                  <div
                    role="presentation"
                    className="flex items-center justify-center h-48 text-stone-500 dark:text-slate-400 text-sm"
                  >
                    No games found matching &ldquo;{globalFilter}&rdquo;
                  </div>
                ) : (
                  <div
                    role="presentation"
                    style={{ height: `${virtualizer.getTotalSize()}px` }}
                    className="relative w-full"
                  >
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                      const row = rows[virtualRow.index]!;
                      return (
                        <div
                          key={row.id}
                          role="row"
                          aria-rowindex={virtualRow.index + 2}
                          className="absolute top-0 left-0 w-full grid grid-cols-[1fr_auto] items-center border-b border-stone-100 dark:border-slate-800/50 hover:bg-stone-50 dark:hover:bg-slate-800/30 transition-colors"
                          style={{
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
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
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
```

The existing footer must remain the next sibling, unchanged, beginning with:

```tsx
            {/* Footer */}
            <div className="shrink-0 border-t border-stone-200 dark:border-slate-700/50 bg-stone-50 dark:bg-[#0d1117]/50 text-xs text-stone-500 dark:text-slate-400">
```

`aria-labelledby="game-database-title"` gives the table the visible “Game Database” accessible name without adding duplicate copy. `aria-sort` belongs on each `columnheader`, while each existing native `button` remains the only sorting control. `role="presentation"` is intentional on the variable-height virtualizer spacer and the empty-state wrapper; it exposes their `row` descendants without claiming an extra table row.

## Repo conventions to follow

- Keep the existing React/TanStack hooks and module-scope row-model constants. Imitate the current stable callback pattern at `src/components/GameDatabase.tsx:230-235` (`useCallback(() => parentRef.current, [])`) and the existing native sort buttons at `src/components/GameDatabase.tsx:316-337`; only add semantics and the stable ID option.
- Keep Tailwind utilities in `src/components/GameDatabase.tsx`; do not introduce CSS modules, a second styling system, or a dependency. Preserve the existing `grid-cols-[1fr_auto]` on both header and body rows so the two columns line up. `w-full` on the header button and `min-w-0` on semantic wrappers prevent the new `columnheader` containers from changing alignment.
- Preserve the current `flex`/`min-h-0`/`overflow-auto` relationship: the role-table wrapper owns the available height, the body rowgroup owns scrolling, and the `relative` presentation spacer owns virtualizer height.

## Steps

1. Re-read `src/components/GameDatabase.tsx` from the refreshed execution base. Confirm the current `useReactTable` call, header/body markup, and footer boundary still match the excerpts above; stop for unrelated drift.
2. Add `getRowId: (row) => row.captureId` to the existing table options. Do not alter `rows`, sorting state, filtering, virtualizer count, or `ROW_HEIGHT`.
3. Replace only the current header/body markup with the target block. Put `role="table"`, `aria-labelledby`, `aria-colcount={2}`, and `aria-rowcount={rows.length + 1}` on the wrapper that contains the header rowgroup and scrolling body rowgroup.
4. Put `role="rowgroup"` on both header and body groups; put `role="row" aria-rowindex={1}` on the header row; put `role="columnheader" aria-sort={ariaSort}` on wrappers around the unchanged sort buttons; put `role="row" aria-rowindex={virtualRow.index + 2}` on each virtual row and `role="cell"` on each cell.
5. Keep the footer as a sibling after the role-table wrapper. Do not give the footer, “Sources” disclosure, loading state, or error state a table role.
6. Keep the edit scoped; do not add a grid keyboard model, focusable rows, `tabIndex`, custom keyboard listeners, or unrelated churn. Commit the allowed source and this plan's status; report the SHA and changed files without merging or pushing.

## Boundaries

- Scope allowance: only `src/components/GameDatabase.tsx` and this plan's `Status` line may change for this plan. Do not edit `plans/README.md`, other plans, `DatabaseInfo.tsx`, styles, dependencies, or unrelated source.
- Do not change the public `GameDatabase` props, `GameEntry` data shape, visible sort cycle, search/filter behavior, virtualizer overscan, fixed 44px row estimate, modal close behavior, or footer wording.
- Do not replace the virtualized `div` implementation with native `<table>` elements; retain the existing scroll and absolute-position layout while exposing the read-only table roles.
- Do not use `role="grid"`, roving focus, row click handlers, or extra interactive behavior. Sorting remains available through the existing native buttons only.
- Plan 009 is a dependent same-file change. Main MUST integrate 007 first, refresh 009's execution base/excerpts, and dispatch 009 serially; never run both executors against `GameDatabase.tsx` concurrently.

## Verification

Main performs this once after the complete authorized plan set lands; the concurrent executor does not run it mid-wave.

- **Mechanical**:
  - `npx react-doctor@latest --scope changed` clears the targeted diagnostic and the score does not regress.
  - `pnpm build`
  - `pnpm lint`
  - `pnpm test:run`
  - No new component test file is required: this repository's permanent tests are utility-focused, so the meaningful regression target is the browser/AX exercise below. If an existing browser harness is available, encode the listed observable ARIA and sorting assertions rather than testing implementation strings.

- **Browser/AX behavior** (run against the actual Vite UI at a desktop width and again at 390px):
  1. Open the app, activate the existing “Browse game database” control, and wait for the database to finish loading. In DevTools/automation, assert there is exactly one `[role="table"]`, its `aria-labelledby` is `game-database-title`, `aria-colcount` is `"2"`, and `aria-rowcount` equals the loaded game count plus one. Read the browser accessibility tree and confirm a named table contains a header rowgroup and body rowgroup, a row at `aria-rowindex="1"`, two columnheaders, and body cells with `role="cell"`; confirm no `role="grid"` is present.
  2. Confirm the table role stops before the metadata footer: `document.querySelector('[role="table"]')?.querySelector('button[aria-expanded]')` must be `null`, while the visible “Sources” button remains operable outside the table.
  3. Verify the default Game Name columnheader reports `aria-sort="ascending"` and Capture ID reports `aria-sort="none"`. Activate each existing header button with a pointer, then focus it and press Enter/Space; confirm the native button still sorts and the corresponding columnheader reports `ascending`/`descending`/`none` as TanStack cycles. No row should become focusable and no custom arrow-key behavior should appear.
  4. Compare the unfiltered footer count with `Number(table.getAttribute('aria-rowcount')) - 1`; they must match. Type a term into the existing search field that yields a smaller result set, then compare the filtered leading footer count (`X of Y games`) with `aria-rowcount - 1`; it must update to the full filtered row model count, not merely the number of mounted virtual rows. Clear the search and confirm the full count returns.
  5. Scroll the body to several positions, including the bottom. Confirm the body remains the flex-growing `overflow-auto` region, every mounted virtual row has `aria-rowindex` equal to its virtual index plus two, no index exceeds `aria-rowcount`, each row exposes exactly two `role="cell"` descendants, and the presentation spacer's computed height still equals the virtualizer's total content height. Check a mounted row's computed height remains 44px and header/body column edges stay aligned at both viewport widths.
  6. Filter to no matches. Confirm the named table remains present with `aria-rowcount="1"`, the header row remains index 1, the body rowgroup exposes no data row, and the existing “No games found…” message remains visible. Verify loading/error paths still render outside this table exactly as before.

- **Done when**: the centralized mechanical checks pass; the browser AX tree exposes a named, read-only two-column table with correct sort and filtered total-row metadata; scrolling, 44px virtualization, alignment, footer separation, and native sorting behavior are unchanged.
