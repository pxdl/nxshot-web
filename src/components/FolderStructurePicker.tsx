import { useCallback, useRef, useState } from "react";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/24/solid";
import { useClickOutside } from "../hooks";
import type { FolderStructure } from "../types";

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
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);
  const selected = OPTIONS.find((o) => o.value === value)!;

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors duration-150 cursor-pointer"
      >
        <div className="min-w-0 text-left">
          <span className="text-xs text-stone-400 dark:text-slate-500 block leading-tight">
            Folder structure
          </span>
          <span className="text-sm font-medium text-stone-700 dark:text-slate-300 block truncate">
            {selected.label}
          </span>
        </div>
        <ChevronUpDownIcon className="w-4 h-4 text-stone-400 dark:text-slate-500 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 bottom-full mb-1.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl dark:shadow-black/40 overflow-hidden z-50">
          {OPTIONS.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
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
                  <span className="text-[11px] text-stone-400 dark:text-slate-500 block truncate">
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
