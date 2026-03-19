import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { loadCaptureIds } from "../utils/captureIds";
import { formatDate } from "../utils/format";
import { Spinner } from "./Spinner";
import type { CaptureIdsMetadata } from "../types";

interface GameEntry {
  captureId: string;
  gameName: string;
}

const columnHelper = createColumnHelper<GameEntry>();

const ROW_HEIGHT = 44;
const estimateRowSize = () => ROW_HEIGHT;
const coreRowModel = getCoreRowModel<GameEntry>();
const sortedRowModel = getSortedRowModel<GameEntry>();
const filteredRowModel = getFilteredRowModel<GameEntry>();

// Splits the query into space-separated tokens and requires each to appear
// as a substring anywhere in the game name or capture ID. This means partial
// words match too — e.g. "rio kart" matches "Mario Kart" via "ma*rio*" and "*kart*".
function multiWordFilter(
  row: { getValue: (id: string) => unknown },
  _columnId: string,
  filterValue: string,
): boolean {
  const tokens = filterValue.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = `${row.getValue("gameName")} ${row.getValue("captureId")}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1 rounded hover:bg-stone-200 dark:hover:bg-slate-600 transition-colors cursor-pointer shrink-0"
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? (
        <ClipboardDocumentCheckIcon className="w-4 h-4 text-emerald-500" />
      ) : (
        <ClipboardDocumentIcon className="w-4 h-4 text-stone-500 dark:text-slate-400" />
      )}
    </button>
  );
}

const CLOSE_DURATION = 150;

const SOURCES: Record<
  keyof CaptureIdsMetadata["sources"],
  { name: string; url: string }
> = {
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

interface GameDatabaseProps {
  metadata: CaptureIdsMetadata;
  onClose: () => void;
}

export function GameDatabase({ metadata, onClose }: GameDatabaseProps) {
  const [data, setData] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "gameName", desc: false },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const closingRef = useRef(false);
  const handleCloseRef = useRef(() => {});

  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);
    setTimeout(onClose, CLOSE_DURATION);
  };
  handleCloseRef.current = handleClose;

  useEffect(() => {
    loadCaptureIds()
      .then((ids) => {
        const entries = Object.entries(ids).map(([captureId, gameName]) => ({
          captureId,
          gameName,
        }));
        setData(entries);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load game database");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!loading) searchRef.current?.focus();
  }, [loading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const columns = useMemo(
    () => [
      columnHelper.accessor("gameName", {
        header: "Game Name",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("captureId", {
        header: "Capture ID",
        cell: (info) => (
          <span className="flex items-center gap-1.5">
            <code className="text-xs font-mono text-stone-500 dark:text-slate-400 select-all truncate max-w-[100px] sm:max-w-[200px] md:max-w-none">
              {info.getValue()}
            </code>
            <CopyButton text={info.getValue()} />
          </span>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: multiWordFilter,
    getCoreRowModel: coreRowModel,
    getSortedRowModel: sortedRowModel,
    getFilteredRowModel: filteredRowModel,
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: useCallback(() => parentRef.current, []),
    estimateSize: estimateRowSize,
    overscan: 5,
  });

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 ${isClosing ? "animate-fade-out" : "animate-fade-in"}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className={`w-full max-w-4xl h-[min(85vh,900px)] bg-white dark:bg-[#161b22] rounded-2xl border border-stone-200/80 dark:border-slate-700/50 shadow-2xl dark:shadow-black/50 flex flex-col overflow-hidden ${isClosing ? "animate-fade-out-down" : "animate-fade-up"}`}>
        {/* Header */}
        <div className="shrink-0 p-4 md:p-6 border-b border-stone-200 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-bold text-stone-800 dark:text-slate-200">
              Game Database
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5 text-stone-500 dark:text-slate-400" />
            </button>
          </div>

          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500 dark:text-slate-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search by game name or capture ID..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-stone-100 dark:bg-slate-800/80 text-stone-800 dark:text-slate-200 border border-stone-200/50 dark:border-slate-700/30 placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus-visible:outline-2 focus-visible:outline-nx text-sm"
            />
            {globalFilter && (
              <button
                type="button"
                onClick={() => setGlobalFilter("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-4 h-4 text-stone-500 dark:text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner className="w-8 h-8 text-nx/50" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-stone-500 dark:text-slate-400 text-sm">
            {error}
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="shrink-0 grid grid-cols-[1fr_auto] border-b border-stone-200 dark:border-slate-700/50 bg-stone-50 dark:bg-[#0d1117]/50">
              {table.getHeaderGroups().map((headerGroup) =>
                headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <button
                      key={header.id}
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className={`flex items-center gap-1.5 px-4 md:px-6 py-3 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-slate-400 hover:text-stone-700 dark:hover:text-slate-300 transition-colors cursor-pointer ${
                        header.id === "captureId"
                          ? "text-right justify-end"
                          : "text-left"
                      }`}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {sorted === "asc" ? (
                        <ChevronUpIcon className="w-3.5 h-3.5" />
                      ) : sorted === "desc" ? (
                        <ChevronDownIcon className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronUpDownIcon className="w-3.5 h-3.5 opacity-30" />
                      )}
                    </button>
                  );
                }),
              )}
            </div>

            {/* Virtualized rows */}
            <div ref={parentRef} className="flex-1 overflow-auto">
              {rows.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-stone-500 dark:text-slate-400 text-sm">
                  No games found matching &ldquo;{globalFilter}&rdquo;
                </div>
              ) : (
                <div
                  style={{ height: `${virtualizer.getTotalSize()}px` }}
                  className="relative w-full"
                >
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index]!;
                    return (
                      <div
                        key={row.id}
                        className="absolute top-0 left-0 w-full grid grid-cols-[1fr_auto] items-center border-b border-stone-100 dark:border-slate-800/50 hover:bg-stone-50 dark:hover:bg-slate-800/30 transition-colors"
                        style={{
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <div
                            key={cell.id}
                            className={`px-4 md:px-6 ${
                              cell.column.id === "gameName"
                                ? "text-sm text-stone-800 dark:text-slate-200 truncate"
                                : "flex justify-end"
                            }`}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-stone-200 dark:border-slate-700/50 bg-stone-50 dark:bg-[#0d1117]/50 text-xs text-stone-500 dark:text-slate-400">
              <div className="flex items-center justify-between px-4 md:px-6 py-3">
                <span className="tabular-nums">
                  {globalFilter
                    ? `${rows.length.toLocaleString()} of ${data.length.toLocaleString()} games`
                    : `${data.length.toLocaleString()} games`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowInfo(!showInfo)}
                  className="flex items-center gap-1 hover:text-stone-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  aria-expanded={showInfo}
                >
                  <InformationCircleIcon className="w-3.5 h-3.5" />
                  <span>Sources</span>
                </button>
              </div>

              {showInfo && (
                <div className="pr-3 pb-3 pt-0 ml-auto flex justify-end">
                  <div className="p-3 rounded bg-white/60 dark:bg-[#161b22]/60 border border-stone-200/50 dark:border-slate-700/30 space-y-2 max-w-sm w-full">
                    <div className="flex justify-between">
                      <span>Generated</span>
                      <span className="font-medium text-stone-700 dark:text-slate-300">
                        {formatDate(new Date(metadata.generatedAt))}
                      </span>
                    </div>
                    {(
                      Object.entries(metadata.sources) as [
                        keyof CaptureIdsMetadata["sources"],
                        CaptureIdsMetadata["sources"][keyof CaptureIdsMetadata["sources"]],
                      ][]
                    ).map(([key, source]) => {
                      if (!source) return null;
                      const info = SOURCES[key];
                      return (
                        <div key={key} className="flex justify-between">
                          <a
                            href={info.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-nx dark:hover:text-nx underline underline-offset-2 decoration-stone-300 dark:decoration-slate-600 hover:decoration-nx transition-colors"
                          >
                            {info.name}
                          </a>
                          <span>
                            {source.count.toLocaleString()} games
                            {source.sourceUpdatedAt && (
                              <span className="text-stone-500 dark:text-slate-400">
                                {" · "}
                                {formatDate(new Date(source.sourceUpdatedAt))}
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
