import { useEffect, useRef, useState } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { loadCaptureIdsMetadata } from "../utils/captureIds";
import type { CaptureIdsMetadata } from "../types";

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

const SOURCES: Record<string, { name: string; url: string }> = {
  switchbrew: {
    name: "Switchbrew",
    url: "https://switchbrew.org/wiki/Title_list/Games",
  },
  nswdb: {
    name: "NSWDB",
    url: "https://nswdb.com",
  },
  titledb: {
    name: "TitleDB",
    url: "https://github.com/blawar/titledb",
  },
};

export function DatabaseInfo() {
  const [metadata, setMetadata] = useState<CaptureIdsMetadata | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCaptureIdsMetadata()
      .then(setMetadata)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  if (error || !metadata) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-10">
      <div ref={containerRef} className="relative">
        {/* Expanded Panel */}
        {isExpanded && (
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4 text-sm">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Capture ID Database
            </h3>
            
            <dl className="space-y-2 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <dt>Total games</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-200">
                  {formatNumber(metadata.totalCount)}
                </dd>
              </div>
              
              <div className="flex justify-between">
                <dt>Generated</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-200">
                  {formatDate(metadata.generatedAt)}
                </dd>
              </div>
            </dl>

            <hr className="my-3 border-slate-200 dark:border-slate-700" />

            <h4 className="text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-2">
              Sources
            </h4>

            <dl className="space-y-3 text-xs">
              {Object.entries(metadata.sources).map(([key, source]) => {
                const sourceInfo = SOURCES[key];
                return (
                  <div key={key}>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <dt className="font-medium">
                        <a
                          href={sourceInfo?.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-red-500 dark:hover:text-red-400 underline underline-offset-2"
                        >
                          {sourceInfo?.name || key}
                        </a>
                      </dt>
                      <dd>{formatNumber(source.count)} games</dd>
                    </div>
                    <div className="flex justify-between text-slate-400 dark:text-slate-500 mt-0.5">
                      <span>Updated on</span>
                      <span>
                        {source.sourceUpdatedAt
                          ? formatDate(source.sourceUpdatedAt)
                          : "Unknown"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </dl>
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-md border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          aria-expanded={isExpanded}
          aria-label="Database information"
        >
          <InformationCircleIcon className="w-4 h-4" />
          <span>{formatNumber(metadata.totalCount)} games</span>
        </button>
      </div>
    </div>
  );
}
