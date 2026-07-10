import { useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { loadCaptureIdsMetadata } from "../utils/captureIds";
import { GameDatabase } from "./GameDatabase";
import type { CaptureIdsMetadata } from "../types";

export function DatabaseInfo() {
  const [metadata, setMetadata] = useState<CaptureIdsMetadata | null>(null);
  const [databaseOpen, setDatabaseOpen] = useState(false);
  const [error, setError] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    loadCaptureIdsMetadata()
      .then(setMetadata)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-10">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => metadata && setDatabaseOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-stone-500 dark:text-slate-400 hover:text-stone-600 dark:hover:text-slate-300 bg-white/80 dark:bg-[#161b22]/80 backdrop-blur-sm rounded-lg border border-stone-200 dark:border-slate-700 hover:border-stone-300 dark:hover:border-slate-600 transition-[color,border-color,background-color,transform] duration-200 ease-snappy active:scale-95 cursor-pointer"
        aria-label="Browse game database"
      >
        <MagnifyingGlassIcon className="w-4 h-4" />
        {metadata ? (
          <span>{metadata.totalCount.toLocaleString()} games</span>
        ) : (
          <span className="inline-block w-16 h-3 bg-stone-200 dark:bg-slate-700 rounded animate-pulse" />
        )}
      </button>

      {databaseOpen && metadata && (
        <GameDatabase
          metadata={metadata}
          onClose={() => {
            setDatabaseOpen(false);
            // Restore focus to the trigger so keyboard/screen-reader users
            // aren't dropped back onto <body> after the dialog closes.
            triggerRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
