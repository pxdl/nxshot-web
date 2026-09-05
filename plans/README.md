# React frontend remediation plans

Audit baseline: `2dcfc83d4f0b1ef7189cc8f76e7e0b788f392b9d` on `improve/react-doctor-fixes`.

All nine vetted findings are selected. The audit found 22 raw React Doctor diagnostics across 45 scanned files and a 42/100 raw score; that score includes unrelated Python `.venv` source pollution. Plans intentionally exclude unconfirmed metric warnings and the separate missed-opportunity suggestions.

## Execution contract

- One plan per isolated Git worktree, Herdr workspace, shell pane and tracked OMP agent.
- Exact executor model: `openai-codex/gpt-6-astra`; reasoning: `max` (both verified in the installed model catalog).
- Main writes/reviews plans and integrates. Source edits happen only in each plan's executor worktree. No source edits in the parent during the planning workflow.
- Executors read their own full plan and applicable repo/skill instructions, implement its scope, commit their allowed files, and report the commit SHA. They do not merge, push, install dependencies, run formatters or perform validation while the parallel wave is in flight.
- Main owns this index and refreshes dependent plans' execution-base stamps/source references before dispatch.
- Local merge into `improve/react-doctor-fixes`; no remote push or PR publication unless separately authorized. Keep isolated worktrees/workspaces available for inspection after completion.
- Main runs the actual browser reproductions and combined build/lint/existing tests/React Doctor after all merges. A landed commit is not marked DONE until its behavioral check passes.

## Dependency graph

```text
001 shared operation ownership ─┬─ 002 empty-folder outcomes
                               └─ 003 visible import errors ── 006 gallery recovery
004 video thumbnail cleanup
005 database error dialog
007 database table semantics ───── 009 full database values
008 folder-popup focus dismissal
```

Start 001, 004, 005, 007 and 008 independently. After their commits are reviewed and merged, start 002, 003 and 009 from the updated integrated base. Finish 006 after 003. No simultaneous App/FolderInput edits, and no simultaneous GameDatabase edits. Nonoverlapping successors may start once their prerequisites are integrated.

## Plan index

| Plan | Finding | Status | Prerequisite | Executor / branch | Commit / verification |
|---|---|---|---|---|---|
| [001](001-shared-operation-ownership.md) | Shared import/export operation ownership | DONE | — | `nxfix001` · `wN:p1` · `fix/react-001-operation-ownership` | `6e9b909` merged; ownership races and current-collection ZIP passed |
| [002](002-empty-folder-outcomes.md) | Empty selections must clear stale captures and report outcome | DONE | 001 | `nxfix002` · `w14:p1` · `fix/react-002-empty-folder-outcomes` | `c2f73b9` merged; native, drop and fallback empty/cancel paths passed |
| [003](003-visible-import-errors.md) | Operation errors must remain visible from Done | DONE | 001 | `nxfix003` · `w15:p1` · `fix/react-003-visible-import-errors` | `512c97a` merged; native/drop failures from Done visibly reported |
| [004](004-video-thumbnail-cleanup.md) | Generated video-thumbnail Blob URL leak | DONE | — | `nxfix004` · `wP:p1` · `fix/react-004-thumbnail-cleanup` | `37a516f` merged; mounted, removed and late-callback URL checks passed |
| [005](005-database-error-dialog.md) | Database failure must remain a real modal | DONE | — | `nxfix005` · `wQ:p1` · `fix/react-005-database-error-dialog` | `d2f88e6` merged; forced render failure, modality and dismissal passed |
| [006](006-gallery-load-recovery.md) | Cached lazy-gallery rejection needs working recovery | DONE | 003 | `nxfix006` · `w16:p1` · `fix/react-006-gallery-load-recovery` | `b145939` merged; blocked module → reload → reselection recovered |
| [007](007-database-table-semantics.md) | Virtualized database needs table and sort semantics | DONE | — | `nxfix007` · `wR:p1` · `fix/react-007-database-table-semantics` | `e28b2eb` merged; table naming, counts, virtual indices and sorting passed |
| [008](008-folder-popup-dismissal.md) | Popup must close when keyboard focus leaves | DONE | — | `nxfix008` · `wS:p1` · `fix/react-008-popup-dismissal` | `40f07eb` merged; focus departure, inert closing and rapid reopen passed |
| [009](009-database-full-values.md) | Full game names and IDs need keyboard/touch disclosure | DONE | 007 | `nxfix009` · `w13:p1` · `fix/react-009-database-full-values` | `09aae6b` merged; desktop/mobile disclosure, copying and focus recovery passed |

## Final verification

- Shared lifecycle: deferred replacement read/export cannot overlap or overwrite current state; cancel/error releases admission; archive contains the currently selected collection.
- Empty native/drop/fallback selection outcomes; explicit cancellation stays silent.
- A failed read after Done exposes one visible alert and permits another attempt.
- Generated JPEG Blob URL is revoked after its video card is removed, including late canvas callbacks; active mounted previews remain usable.
- Forced database render failure traps focus, closes with Escape/Close, and restores its trigger.
- Gallery resource failure exposes a reload action; after restoring the resource, reload plus reselection loads the gallery.
- Database table roles, total row counts, virtual row indices, stable identities and ascending/descending sort announcements.
- Popup Tab/Shift+Tab dismissal, internal navigation, Escape, close-animation inertness and rapid reopen.
- At 390px and desktop, full names/IDs are available through a readable modal, copying works, Escape closes only the detail layer, and focus returns correctly.
- `pnpm build`, `pnpm lint`, `pnpm test:run`, changed-scope React Doctor against `2dcfc83`, and final full scan. Report exact results and any baseline-only diagnostics.

Use generated in-memory browser fixtures and a memory writer. Do not authorize real directory/file permissions or create archives in the user's filesystem for QA. Existing unrelated worktrees and running agents must remain untouched.

## Central verification

Completed 2026-09-05 against integrated source revision `24c1f5b615e69796da881a234b3bd543cb0a2c7c`. All nine implementations merged without conflicts into `improve/react-doctor-fixes`. Nothing was pushed or published as a PR.

Browser checks used Chromium, generated in-memory files and ZIP writers, and the actual Vite application at `http://127.0.0.1:5179/`. The fallback input was exercised with native-picker support disabled in Chromium, not in a separate Safari/Firefox engine. No real directory permissions were granted and no archives were written to the user's filesystem.

| Plan | Observed behavioral evidence |
|---|---|
| 001 | A deferred replacement read disabled export and rejected a competing drop; a deferred ZIP writer rejected a competing drop. The native picker retained user activation. Cancellation released admission. The completed ZIP had one central-directory entry for the new collection, not the previous collection. |
| 002 | Empty native-directory, dropped-directory and non-null empty `FileList` completions cleared the old collection and showed the no-captures outcome. Explicit cancellation and a null `FileList` stayed silent and preserved the selected collection. The real input `FileList` was cleared only after its files had been captured for processing. |
| 003 | Injected native and dropped-directory `NotReadableError` failures after Done each produced exactly one visible alert. Done remained visible and another import was enabled. |
| 004 | A mounted video card displayed a decoded 320×180 generated JPEG with no premature revocation. Deselect/reselect preserved the same live URL without allocating another generated URL. Removing the card revoked its generated URL once. Delivering a held canvas callback after removal created zero new URLs; no video-source URLs remained live. |
| 005 | A forced database date-render failure produced a native `:modal` alert dialog with its title/description and Close focus. Background focus was blocked; Tab did not reach background controls. Escape and Close restored the Browse trigger and preserved three selected files. Removing the fault restored normal database/source-metadata rendering. |
| 006 | One gallery-module request was actually aborted. The failure exposed the reload action and reselection guidance. Activating that action performed a real navigation; after restoring the resource and reselecting, one successful module request produced two games, two selected files and two decoded previews. |
| 007 | Chromium's AX tree exposed the named “Game Database” table with two column headers, 19 rendered rows and 36 body cells; virtual rows retained their 44px layout height. Total-row metadata was 30,661 including the header. Virtual scrolling exposed contiguous indices 269–290; filtering to one entry changed the total to two including the header. Game-name sorting announced ascending and descending states; Sources remained outside the table. |
| 008 | Arrow navigation and focus movement within the picker kept it open. Tab/Shift+Tab leaving the picker closed it without pulling focus back. Closing options were inert and all four had `tabIndex=-1`. Escape restored the trigger, and reopening during the close animation remained open after the old timer's deadline. |
| 009 | A real 191-character game name and 32-character ID were fully readable on desktop and at 390px in light/dark modes without horizontal overflow. Keyboard and touch opened the details; touch and Escape dismissed them. Copy failure exposed feedback while retaining readable values; retry copied the complete ID. Escape closed only the detail layer and restored its opener; when virtualization removed the opener, focus returned to Search. |

### Mechanical checks

| Check | Result |
|---|---|
| `pnpm build` | PASS — TypeScript and production build |
| `pnpm lint` | PASS |
| `pnpm test:run` | PASS — 5 files, 60 tests |
| React Doctor 0.9.13, changed against `2dcfc83` | 56/100, Critical; 1 error, 2 warnings across 3 files |
| React Doctor 0.9.13, full | 42/100, Critical; 3 errors, 18 warnings across 14 files |

React Doctor is **not clean**. The full score remains 42/100; its diagnostic count is 21 versus 22 in the audit. The changed and full scores cover different scopes and are not an improvement comparison.

Remaining changed-scope diagnostics:

- `App.tsx:40` — `no-high-complexity-react-function`; the broader App decomposition was not one of the selected fixes.
- `FolderInput.tsx:121` — `effect-needs-cleanup` timer heuristic. The guarded focus handler retains its cleanup. Repeated-focus, cancellation, null-list and completed-change probes scheduled three timers, with at most one live at once and zero remaining afterward.
- `GameDatabase.tsx:447` — `prefer-tag-over-role`; the plan deliberately retained virtualization and added explicit table semantics rather than replacing it with a native table.

The full scan also includes unrelated Python `.venv` and vendored StreamSaver diagnostics, plus broader project-wide heuristics outside these nine fixes. No suppressions or unrelated refactors were added to chase the raw score.

All four QA tabs were released, request interception and injected render/timer faults were removed, and the temporary Vite server was stopped. Executor branches, worktrees and Herdr workspaces remain available at their implementation commits for inspection.
