import { lazy, Suspense, useEffect, useState } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { loadCaptureIdsMetadata } from "../utils/captureIds";
import { Spinner } from "./Spinner";
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
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
              <div className="w-full max-w-4xl h-[min(85vh,900px)] bg-white dark:bg-[#161b22] rounded-2xl border border-stone-200/80 dark:border-slate-700/50 shadow-2xl dark:shadow-black/50 flex flex-col overflow-hidden animate-fade-up">
                <div className="shrink-0 p-4 md:p-6 border-b border-stone-200 dark:border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-display font-bold text-stone-800 dark:text-slate-200">
                      Game Database
                    </h2>
                    <button
                      type="button"
                      onClick={() => setDatabaseOpen(false)}
                      className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      aria-label="Close"
                    >
                      <XMarkIcon className="w-5 h-5 text-stone-500 dark:text-slate-400" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <Spinner className="w-8 h-8 text-nx/50" />
                </div>
              </div>
            </div>
          }
        >
          <GameDatabase
            metadata={metadata}
            onClose={() => setDatabaseOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
