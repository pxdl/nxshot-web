import { lazy, Suspense, useEffect, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { loadCaptureIdsMetadata } from "../utils/captureIds";
import type { CaptureIdsMetadata } from "../types";

const GameDatabase = lazy(() =>
  import("./GameDatabase").then((m) => ({ default: m.GameDatabase }))
);

export function DatabaseInfo() {
  const [metadata, setMetadata] = useState<CaptureIdsMetadata | null>(null);
  const [databaseOpen, setDatabaseOpen] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadCaptureIdsMetadata()
      .then(setMetadata)
      .catch(() => setError(true));
  }, []);

  if (error || !metadata) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-10">
      <button
        type="button"
        onClick={() => setDatabaseOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-stone-500 dark:text-slate-400 hover:text-stone-600 dark:hover:text-slate-300 bg-white/80 dark:bg-[#161b22]/80 backdrop-blur-sm rounded-lg border border-stone-200 dark:border-slate-700 hover:border-stone-300 dark:hover:border-slate-600 transition-all cursor-pointer"
        aria-label="Browse game database"
      >
        <MagnifyingGlassIcon className="w-4 h-4" />
        <span>{metadata.totalCount.toLocaleString()} games</span>
      </button>

      {databaseOpen && (
        <Suspense fallback={null}>
          <GameDatabase
            metadata={metadata}
            onClose={() => setDatabaseOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
