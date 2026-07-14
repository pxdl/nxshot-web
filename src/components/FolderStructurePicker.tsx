import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/24/solid";
import { useClickOutside } from "../hooks";
import type { FolderStructure } from "../types";

// Keep in sync with --animate-popover-out duration in globals.css
const POPOVER_CLOSE_MS = 130;

const OPTIONS: { value: FolderStructure; label: string; example: string }[] = [
  {
    value: "by-game",
    label: "By game",
    example: "Game Name/screenshot.jpg",
  },
  {
    value: "by-date",
    label: "By date",
    example: "2024/March/screenshot.jpg",
  },
  {
    value: "by-game-date",
    label: "Game + date",
    example: "Game Name/2024-03/screenshot.jpg",
  },
  {
    value: "flat-renamed",
    label: "Flat renamed",
    example: "Game Name - 2024-03-15 14.30.00.jpg",
  },
];

interface FolderStructurePickerProps {
  value: FolderStructure;
  onChange: (value: FolderStructure) => void;
}

export function FolderStructurePicker({
  value,
  onChange,
}: FolderStructurePickerProps) {
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

  return (
    <div className="relative w-full" ref={ref}>
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
                tabIndex={index === activeIndex ? 0 : -1}
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
}
