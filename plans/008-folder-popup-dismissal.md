# 008 — Dismiss the folder picker when focus leaves its root

- **Status**: IN PROGRESS — implementation complete; pending central QA.
- **Commit**: 2dcfc83 (audit baseline; the orchestrator refreshes the execution base after any authorized dependencies)
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Rule**: Beyond the scan — focus-leave and roving-focus behavior
- **Dependencies**: None; reuse the existing React focus handlers and native `inert` attribute.
- **Estimated scope**: 1 existing source file; focus-leave handler and closing inertness only.

## Problem

`src/components/FolderStructurePicker.tsx:37-200` keeps the popup open when keyboard focus leaves the picker. Verified sequence: focus the trigger, press ArrowDown to open and focus the active option, then Tab to Download; the popup remains expanded. Leaving focus must itself dismiss this stale listbox. Keep the separate existing document-level Escape/outside-click behavior unchanged.

Current close/open and focus ownership:

```tsx
// src/components/FolderStructurePicker.tsx:41-90 — current
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closingRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = OPTIONS.findIndex((option) => option.value === value);
  const selected = OPTIONS[selectedIndex]!;
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  // Play the exit animation, then unmount once it finishes.
  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
      closingRef.current = false;
    }, POPOVER_CLOSE_MS);
  }, []);

  const focusOption = useCallback((index: number) => {
    const nextIndex = (index + OPTIONS.length) % OPTIONS.length;
    setActiveIndex(nextIndex);
    requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
  }, []);

  // Opening cancels any in-flight close, so the menu is grabbable mid-exit.
  const openMenu = useCallback(
    (index = selectedIndex) => {
      clearTimeout(closeTimerRef.current);
      closingRef.current = false;
      setIsClosing(false);
      setOpen(true);
      focusOption(index);
    },
    [focusOption, selectedIndex],
  );

  const closeAndRestoreFocus = useCallback(() => {
    close();
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [close]);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  useClickOutside(ref, open, close);
```

The trigger correctly reports `aria-expanded={open && !isClosing}` at lines 107-109, but the root at lines 91-92 has no `onBlur` boundary. The options at lines 132-196 use roving `tabIndex` and retain the active option at `0` even while `isClosing`, so the closing list can remain a keyboard destination during its 130 ms exit.

Existing outside/Escape behavior is intentionally narrow and must remain the only document-level listener:

```tsx
// src/hooks/useClickOutside.ts:3-24 — preserve unchanged
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  onClose: () => void
) {
  useEffect(() => {
    if (!enabled) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref, enabled, onClose]);
}
```

## Target

Keep the existing 130 ms `close`, timeout cleanup, `openMenu` cancellation, `closeAndRestoreFocus`, trigger key handling, and `useClickOutside` call. Add a focus-leave guard directly to the existing picker root, mark the closing list inert, and force every option to `tabIndex={-1}` while it is closing.

The target changed sections are:

```tsx
  // Play the exit animation, then unmount once it finishes.
  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
      closingRef.current = false;
    }, POPOVER_CLOSE_MS);
  }, []);

  const focusOption = useCallback((index: number) => {
    const nextIndex = (index + OPTIONS.length) % OPTIONS.length;
    setActiveIndex(nextIndex);
    requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
  }, []);

  // Opening cancels any in-flight close, so the menu is grabbable mid-exit.
  const openMenu = useCallback(
    (index = selectedIndex) => {
      clearTimeout(closeTimerRef.current);
      closingRef.current = false;
      setIsClosing(false);
      setOpen(true);
      focusOption(index);
    },
    [focusOption, selectedIndex],
  );

  const closeAndRestoreFocus = useCallback(() => {
    close();
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [close]);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  useClickOutside(ref, open, close);

  return (
    <div
      className="relative w-full"
      ref={ref}
      onBlur={(event) => {
        if (
          open &&
          !isClosing &&
          !event.currentTarget.contains(event.relatedTarget as Node | null)
        ) {
          close();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() =>
          open && !isClosing ? close() : openMenu(selectedIndex)
        }
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(
              event.key === "ArrowDown" ? selectedIndex : OPTIONS.length - 1,
            );
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open && !isClosing}
        aria-label={`Folder structure: ${selected.label}`}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors duration-150 cursor-pointer"
      >
        <div className="min-w-0 text-left">
          <span className="text-xs text-stone-500 dark:text-slate-400 block leading-tight">
            Folder structure
          </span>
          <span className="text-sm font-medium text-stone-700 dark:text-slate-300 block truncate">
            {selected.label}
          </span>
        </div>
        <ChevronUpDownIcon className="w-4 h-4 text-stone-500 dark:text-slate-400 shrink-0" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Folder structure"
          inert={isClosing}
          className={`absolute left-0 right-0 bottom-full mb-1.5 origin-bottom ${isClosing ? "animate-popover-out" : "animate-popover-in"} rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl dark:shadow-black/40 overflow-hidden z-50`}
        >
          {OPTIONS.map((option, index) => {
            const isSelected = value === option.value;
            return (
              <button
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={
                  isClosing ? -1 : index === activeIndex ? 0 : -1
                }
                onFocus={() => setActiveIndex(index)}
                onKeyDown={(event) => {
                  switch (event.key) {
                    case "ArrowDown":
                      event.preventDefault();
                      focusOption(index + 1);
                      break;
                    case "ArrowUp":
                      event.preventDefault();
                      focusOption(index - 1);
                      break;
                    case "Home":
                      event.preventDefault();
                      focusOption(0);
                      break;
                    case "End":
                      event.preventDefault();
                      focusOption(OPTIONS.length - 1);
                      break;
                    case "Escape":
                      event.preventDefault();
                      event.stopPropagation();
                      closeAndRestoreFocus();
                      break;
                  }
                }}
                onClick={() => {
                  onChange(option.value);
                  closeAndRestoreFocus();
                }}
                className={`w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors duration-100 cursor-pointer ${
                  isSelected
                    ? "bg-nx/5 dark:bg-nx/10"
                    : "hover:bg-stone-50 dark:hover:bg-slate-700/50"
                }`}
              >
                <CheckIcon
                  className={`w-4 h-4 mt-0.5 shrink-0 transition-opacity ${
                    isSelected ? "text-nx opacity-100" : "opacity-0"
                  }`}
                />
                <div className="min-w-0">
                  <span
                    className={`text-sm font-medium block ${
                      isSelected
                        ? "text-nx"
                        : "text-stone-700 dark:text-slate-300"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-slate-400 block truncate">
                    {option.example}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
```

The `relatedTarget` guard is the important boundary: focus moving among the trigger and options stays inside the root and does not close; focus moving to Download or any other outside element closes the popup. A null related target (for example, focus leaving the document) is treated as outside because `contains(null)` is false. `inert={isClosing}` and the closing `tabIndex` override remove the options from keyboard navigation immediately when the 130 ms exit starts, so no invisible active option can be reached before unmount.

## Repo conventions to follow

- Preserve the existing roving-focus implementation in `src/components/FolderStructurePicker.tsx:132-196`: ArrowDown/ArrowUp wrap through `focusOption`, Home/End jump to bounds, option focus updates `activeIndex`, and native button activation keeps Enter behavior.
- Preserve `close`'s `POPOVER_CLOSE_MS` timer at `src/components/FolderStructurePicker.tsx:6-7,52-62`, including the idempotent `closingRef` guard and the `openMenu` timeout cancellation that makes rapid reopen work.
- Keep `useClickOutside(ref, open, close)` and `src/hooks/useClickOutside.ts:8-24` unchanged. Its existing document mousedown/Escape behavior is the picker’s outside-click fallback; do not add a window-wide key handler.
- Keep the existing Tailwind popover classes and `animate-popover-in`/`animate-popover-out` pair. The 130 ms animation remains synchronized with `POPOVER_CLOSE_MS` and `src/styles/globals.css:130-153`.

## Steps

1. Confirm `src/components/FolderStructurePicker.tsx:37-203` and `src/hooks/useClickOutside.ts:3-24` still match the audit baseline. If unrelated edits are present, stop and report drift rather than merging around them.
2. Add an `onBlur` handler to the existing root `<div>`. When the picker is open and not already closing, call `close()` only when `event.currentTarget.contains(event.relatedTarget as Node | null)` is false. Do not close when focus moves between the trigger and an option inside the root.
3. Add `inert={isClosing}` to the rendered listbox and change the option tab index to `isClosing ? -1 : index === activeIndex ? 0 : -1`. Keep the active option and all internal keyboard handlers unchanged while open.
4. Verify `aria-expanded` continues to become false immediately when closing starts, the popover remains mounted for exactly the existing 130 ms animation, and `openMenu` still clears the timer and restores interactivity/focus when reopened during that animation.
5. Keep the edit scoped without unrelated formatting or behavior changes. Commit only FolderStructurePicker and this plan's status; return SHA/changed files without merging or pushing. Do not edit the hook, global CSS, or Download controls.

## Boundaries

- Change only `src/components/FolderStructurePicker.tsx` plus this plan's own status if the executor records it; do not change `useClickOutside.ts`, global styles, callers, configuration, or dependencies.
- Do not replace roving focus with a different menu/listbox implementation, remove Arrow/Home/End/Escape/Enter behavior, alter option order/labels, or change `POPOVER_CLOSE_MS`.
- Do not add a document/window key handler. The root-level focus boundary must be the dismissal mechanism for Tab/focus leaving; the existing hook remains untouched.
- Do not remove the animation or unmount synchronously. Closing must still animate for 130 ms, while `inert` and `tabIndex=-1` prevent invisible tabbables during that interval.
- The execution base must be refreshed by the orchestrator after authorized dependencies. Stop if unrelated drift from `2dcfc83` is present.

## Verification

The executor skips build, lint, tests, formatters, React Doctor and browser/server launches during concurrent work. The central integrator runs these after all authorized implementations land:

- **Mechanical**:
  - Run the changed-scope React Doctor scan and confirm no new accessibility diagnostic is introduced; use `npx react-doctor@latest --scope changed` as the required command.
  - Run `pnpm build` and `pnpm lint` for TypeScript/ESLint coverage.
  - Run `pnpm test:run` for the existing Vitest suite. The repository has no component DOM test harness, so do not add one solely for this interaction; the browser sequence below is the focused regression check.
- **Behavior check**:
  1. Open the folder structure picker with the trigger’s ArrowDown and confirm the selected option receives focus. Use ArrowDown/ArrowUp, Home, End, and Enter to confirm the existing roving focus and selection behavior remains intact.
  2. With an option focused, press Tab. Confirm focus moves to the next Download control, `aria-expanded` becomes false immediately, and the popup starts its existing 130 ms exit animation instead of remaining expanded.
  3. During that exit interval, press Tab/Shift+Tab as appropriate and inspect the active element: no option is tabbable or programmatically reachable through the closing list; the listbox is inert. After 130 ms it is unmounted.
  4. From an option, press Escape and confirm the existing handler stops propagation, closes with the 130 ms animation, and restores focus to the picker trigger. Activate an option with Enter/click and confirm selection plus focus restoration are unchanged.
  5. Reopen by clicking/activating the trigger while the exit animation is in flight. Confirm the close timer is cancelled, the popup becomes interactive again, the correct option receives focus, and no stale `isClosing` state or duplicate close occurs. Also click outside and press Escape through the existing `useClickOutside` path.
- **Done when**: the focus-leave sequence dismisses the popup, closing options are inert and `tabIndex=-1`, internal roving/activation keys and 130 ms motion are unchanged, rapid reopen works, and no new global listener or dependency was introduced.
