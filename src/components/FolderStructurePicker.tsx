import type { FolderStructure } from "../types";

const OPTIONS: { value: FolderStructure; label: string; example: string }[] = [
  {
    value: "by-game",
    label: "By game",
    example: "Zelda TOTK/screenshot.jpg",
  },
  {
    value: "by-date",
    label: "By date",
    example: "2024/March/screenshot.jpg",
  },
  {
    value: "by-game-date",
    label: "Game + date",
    example: "Zelda TOTK/2024-03/screenshot.jpg",
  },
  {
    value: "flat-renamed",
    label: "Flat renamed",
    example: "Zelda TOTK - 2024-03-15 14.30.00.jpg",
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
  return (
    <div className="w-full max-w-md">
      <p className="text-xs font-medium text-stone-500 dark:text-slate-400 mb-2">
        Folder structure
      </p>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`text-left px-3 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                isSelected
                  ? "border-nx/50 bg-nx/5 dark:bg-nx/10 ring-1 ring-nx/20"
                  : "border-stone-200/50 dark:border-slate-700/30 bg-stone-50 dark:bg-slate-800/50 hover:bg-stone-100 dark:hover:bg-slate-800"
              }`}
            >
              <span
                className={`text-sm font-medium block ${
                  isSelected
                    ? "text-nx"
                    : "text-stone-700 dark:text-slate-300"
                }`}
              >
                {option.label}
              </span>
              <span className="text-[11px] text-stone-400 dark:text-slate-500 block mt-0.5 truncate">
                {option.example}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
