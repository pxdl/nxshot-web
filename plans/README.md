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
| [001](001-shared-operation-ownership.md) | Shared import/export operation ownership | IN PROGRESS | — | `nxfix001` · `wN:p1` · `fix/react-001-operation-ownership` | Base `7b39164`; implementation running |
| [002](002-empty-folder-outcomes.md) | Empty selections must clear stale captures and report outcome | TODO | 001 | Not launched | — |
| [003](003-visible-import-errors.md) | Operation errors must remain visible from Done | TODO | 001 | Not launched | — |
| [004](004-video-thumbnail-cleanup.md) | Generated video-thumbnail Blob URL leak | IN PROGRESS | — | `nxfix004` · `wP:p1` · `fix/react-004-thumbnail-cleanup` | `37a516f` merged; central QA pending |
| [005](005-database-error-dialog.md) | Database failure must remain a real modal | IN PROGRESS | — | `nxfix005` · `wQ:p1` · `fix/react-005-database-error-dialog` | `d2f88e6` merged; central QA pending |
| [006](006-gallery-load-recovery.md) | Cached lazy-gallery rejection needs working recovery | TODO | 003 | Not launched | — |
| [007](007-database-table-semantics.md) | Virtualized database needs table and sort semantics | IN PROGRESS | — | `nxfix007` · `wR:p1` · `fix/react-007-database-table-semantics` | `e28b2eb` merged; central QA pending |
| [008](008-folder-popup-dismissal.md) | Popup must close when keyboard focus leaves | IN PROGRESS | — | `nxfix008` · `wS:p1` · `fix/react-008-popup-dismissal` | `40f07eb` merged; central QA pending |
| [009](009-database-full-values.md) | Full game names and IDs need keyboard/touch disclosure | TODO | 007 | Not launched | — |

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
