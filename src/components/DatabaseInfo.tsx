import { useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { loadCaptureIdsMetadata } from "../utils/captureIds";
import { GameDatabase } from "./GameDatabase";
import type { CaptureIdsMetadata } from "../types";
import { ErrorBoundary } from "./ErrorBoundary";
import { Card } from "./Card";
import {
  buttonBaseStyles,
  buttonVariantStyles,
} from "./buttonStyles";

interface DatabaseErrorFallbackProps {
  onClose: () => void;
}

function DatabaseErrorFallback({ onClose }: DatabaseErrorFallbackProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="database-error-title"
      aria-describedby="database-error-description"
    >
      <div className="w-full max-w-md">
        <Card>
          <div className="flex flex-col gap-4 text-center">
            <h2
              id="database-error-title"
              className="text-xl font-display font-bold text-stone-800 dark:text-slate-200"
            >
              Game database unavailable
            </h2>
            <p
              id="database-error-description"
              className="text-sm text-stone-500 dark:text-slate-400"
            >
              The game database could not be displayed. Your selected files are
              unchanged.
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className={`${buttonBaseStyles} ${buttonVariantStyles.secondary}`}
            >
              Close
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

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

  const closeDatabase = () => {
    setDatabaseOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

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
        <ErrorBoundary
          fallback={<DatabaseErrorFallback onClose={closeDatabase} />}
        >
          <GameDatabase metadata={metadata} onClose={closeDatabase} />
        </ErrorBoundary>
      )}
    </div>
  );
}
