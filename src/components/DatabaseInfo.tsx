import { useEffect, useRef, useState } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { loadCaptureIdsMetadata } from "../utils/captureIds";
import { formatDate } from "../utils/format";
import type { CaptureIdsMetadata } from "../types";

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
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-[#161b22] rounded-xl shadow-xl dark:shadow-2xl dark:shadow-black/30 border border-stone-200 dark:border-slate-700/50 p-4 text-sm">
            <h3 className="font-semibold text-stone-800 dark:text-slate-200 mb-3">
              Capture ID Database
            </h3>

            <dl className="space-y-2 text-stone-500 dark:text-slate-400">
              <div className="flex justify-between">
                <dt>Total games</dt>
                <dd className="font-medium text-stone-800 dark:text-slate-200">
                  {formatNumber(metadata.totalCount)}
                </dd>
              </div>

              <div className="flex justify-between">
                <dt>Generated</dt>
                <dd className="font-medium text-stone-800 dark:text-slate-200">
                  {formatDate(new Date(metadata.generatedAt))}
                </dd>
              </div>
            </dl>

            <hr className="my-3 border-stone-200 dark:border-slate-700/50" />

            <h4 className="text-xs font-medium text-stone-400 dark:text-slate-500 uppercase tracking-wide mb-2">
              Sources
            </h4>

            <dl className="space-y-3 text-xs">
              {Object.entries(metadata.sources).map(([key, source]) => {
                const sourceInfo = SOURCES[key];
                return (
                  <div key={key}>
                    <div className="flex justify-between text-stone-500 dark:text-slate-400">
                      <dt className="font-medium">
                        <a
                          href={sourceInfo?.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-nx dark:hover:text-nx underline underline-offset-2 decoration-stone-300 dark:decoration-slate-600 hover:decoration-nx transition-colors"
                        >
                          {sourceInfo?.name || key}
                        </a>
                      </dt>
                      <dd>{formatNumber(source.count)} games</dd>
                    </div>
                    <div className="flex justify-between text-stone-400 dark:text-slate-500 mt-0.5">
                      <span>Updated on</span>
                      <span>
                        {source.sourceUpdatedAt
                          ? formatDate(new Date(source.sourceUpdatedAt))
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
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300 bg-white/80 dark:bg-[#161b22]/80 backdrop-blur-sm rounded-lg border border-stone-200 dark:border-slate-700 hover:border-stone-300 dark:hover:border-slate-600 transition-all cursor-pointer"
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
