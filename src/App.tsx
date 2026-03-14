import {
  CameraIcon,
  CheckCircleIcon,
  FolderIcon,
  ArrowDownTrayIcon,
  ArrowUturnLeftIcon,
  PhotoIcon,
} from "@heroicons/react/24/solid";

import { Button } from "./components/Button";
import { Card } from "./components/Card";
import { DatabaseInfo } from "./components/DatabaseInfo";
import { ErrorAlert } from "./components/ErrorAlert";
import { FolderInput } from "./components/FolderInput";
import { FolderStructureGuide } from "./components/FolderStructureGuide";
import { FolderStructurePicker } from "./components/FolderStructurePicker";
import { Gallery } from "./components/Gallery";
import { Spinner } from "./components/Spinner";
import { ThemeToggle } from "./components/ThemeToggle";
import { useScreenshotProcessor, useDropZone } from "./hooks";
import { formatSize } from "./utils/format";
import { isSafari } from "./utils/zip";

// Safari warning threshold: 500MB
const SAFARI_SIZE_WARNING_THRESHOLD = 500 * 1024 * 1024;
const IS_SAFARI = isSafari();

export default function App() {
  const {
    status,
    error,
    gameGroups,
    selectedGames,
    currentFileIndex,
    totalFiles,
    processingPhase,
    savedFilename,
    scanCount,
    progress,
    selectedFileCount,
    selectedSizeBytes,
    totalFileCount,
    folderStructure,
    setFolderStructure,
    processFiles,
    downloadZip,
    toggleGame,
    selectAll,
    deselectAll,
    backToGallery,
  } = useScreenshotProcessor();

  const canAcceptDrop =
    status !== "scanning" && status !== "loading" && status !== "processing";
  const { isDragging, isReading: isReadingDrop } = useDropZone((files) => {
    if (canAcceptDrop) processFiles(files);
  });

  const showSafariWarning =
    IS_SAFARI && selectedSizeBytes > SAFARI_SIZE_WARNING_THRESHOLD;

  const isGalleryView = status === "ready" && gameGroups.length > 0;

  return (
    <div className="min-h-screen flex flex-col relative bg-stone-50 dark:bg-[#0d1117]">
      {/* Drop Overlay (drag hover + reading) */}
      {((isDragging && canAcceptDrop) || isReadingDrop) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-50/90 dark:bg-[#0d1117]/90 backdrop-blur-sm"
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-4 p-16 rounded-2xl border-2 border-dashed border-nx/40 bg-white/60 dark:bg-[#161b22]/60">
            {isReadingDrop ? (
              <Spinner className="w-16 h-16 text-nx/50" />
            ) : (
              <FolderIcon className="w-16 h-16 text-nx/50" />
            )}
            <p className="text-lg font-semibold text-stone-600 dark:text-slate-300">
              {isReadingDrop
                ? "Reading folder..."
                : "Drop your Album folder here"}
            </p>
          </div>
        </div>
      )}

      {/* Red accent bar */}
      <div className="h-1 bg-gradient-to-r from-transparent via-nx to-transparent shrink-0" />

      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="bg-glow absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px]" />
      </div>

      {/* Theme Toggle */}
      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle />
      </div>

      <main
        className={`flex-1 flex flex-col items-center px-4 py-8 relative z-[1] ${
          isGalleryView ? "" : "justify-center"
        }`}
      >
        {/* Header */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="flex items-baseline justify-center gap-2.5 mb-3">
            <CameraIcon
              className="w-10 h-10 md:w-12 md:h-12 text-nx translate-y-[3px]"
              aria-hidden="true"
            />
            <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight">
              <span className="text-nx">nx</span>
              <span className="text-stone-800 dark:text-white">shot</span>
            </h1>
          </div>
          <p className="text-lg md:text-xl text-stone-500 dark:text-slate-400 font-medium tracking-tight">
            Organize your Nintendo Switch screenshots
          </p>
        </div>

        {/* Idle / Scanning State */}
        {(status === "idle" || status === "scanning") && (
          <div
            className="w-full max-w-md animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            <Card>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-5">
                  {status === "idle" && <FolderStructureGuide />}

                  <FolderInput
                    onFilesSelected={processFiles}
                    disabled={status === "scanning"}
                    variant="secondary"
                    icon={
                      status === "scanning" ? (
                        <Spinner className="w-5 h-5" />
                      ) : (
                        <FolderIcon className="w-5 h-5" />
                      )
                    }
                  >
                    {status === "scanning"
                      ? `Scanning... ${scanCount > 0 ? `(${scanCount} found)` : ""}`
                      : "Select folder"}
                  </FolderInput>

                  {status === "idle" && (
                    <p className="text-xs text-stone-400 dark:text-slate-500 text-center">
                      or drag & drop your Album folder here
                    </p>
                  )}
                </div>

                {error && <ErrorAlert message={error} />}
              </div>
            </Card>
          </div>
        )}

        {/* Gallery State — kept mounted to preserve thumbnail cache */}
        {gameGroups.length > 0 && (
          <div
            className={`w-full max-w-6xl ${isGalleryView ? "animate-fade-up" : "hidden"}`}
            style={isGalleryView ? { animationDelay: "0.1s" } : undefined}
          >
            {error && <ErrorAlert message={error} className="mb-4" />}

            <Gallery
              gameGroups={gameGroups}
              selectedGames={selectedGames}
              selectedFileCount={selectedFileCount}
              totalFileCount={totalFileCount}
              onToggleGame={toggleGame}
              onSelectAll={selectAll}
              onDeselectAll={deselectAll}
            />

            <div className="mt-8 flex flex-col items-center gap-4">
              {/* Safari Warning */}
              {showSafariWarning && (
                <div className="w-full max-w-md">
                  <ErrorAlert variant="warning">
                    <p className="font-semibold">
                      Large collection detected (
                      {formatSize(selectedSizeBytes)})
                    </p>
                    <p className="mt-1">
                      Safari may struggle with collections this size. Downloads
                      may appear as 0KB or empty. For best results, use Chrome
                      or Firefox.
                    </p>
                  </ErrorAlert>
                </div>
              )}

              <div className="w-full max-w-md">
                <FolderStructurePicker
                  value={folderStructure}
                  onChange={setFolderStructure}
                />
              </div>

              <div className="w-full max-w-md">
                <Button
                  onClick={downloadZip}
                  variant="primary"
                  disabled={selectedFileCount === 0}
                  icon={<ArrowDownTrayIcon className="w-5 h-5" />}
                >
                  {selectedFileCount > 0
                    ? `Download ZIP (${selectedFileCount} files)`
                    : "Select games to download"}
                </Button>
              </div>

              <FolderInput
                onFilesSelected={processFiles}
                variant="ghost"
                icon={<FolderIcon className="w-5 h-5" />}
              >
                Select a different folder
              </FolderInput>
            </div>
          </div>
        )}

        {/* Processing State */}
        {(status === "loading" || status === "processing") && (
          <div
            className="w-full max-w-md animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            <Card>
              <div className="flex flex-col gap-6">
                {/* Status Badge */}
                <div
                  aria-live="polite"
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-stone-100 dark:bg-slate-800/80 rounded-xl border border-stone-200/50 dark:border-slate-700/30"
                >
                  <PhotoIcon
                    className="w-5 h-5 text-stone-400 dark:text-slate-500"
                    aria-hidden="true"
                  />
                  <span className="text-stone-600 dark:text-slate-300 font-medium">
                    {status === "loading" && processingPhase}
                    {status === "processing" && (
                      <>
                        {processingPhase} ({currentFileIndex}/{totalFiles})
                      </>
                    )}
                  </span>
                </div>

                {/* Progress Bar */}
                {status === "processing" && (
                  <div>
                    <div
                      role="progressbar"
                      aria-valuenow={Math.round(progress)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Processing files: ${Math.round(progress)}% complete`}
                      className="h-2.5 bg-stone-100 dark:bg-slate-800 rounded-full overflow-hidden"
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300 ease-out relative bg-gradient-to-r from-nx to-red-400"
                        style={{ width: `${progress}%` }}
                      >
                        <div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer"
                          style={{ backgroundSize: "200% 100%" }}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-stone-400 dark:text-slate-500 text-center font-mono">
                      {Math.round(progress)}%
                    </p>
                  </div>
                )}

                <Button
                  disabled
                  variant="primary"
                  icon={<Spinner className="w-5 h-5" />}
                >
                  {status === "loading" ? "Loading..." : "Processing..."}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Done State */}
        {status === "done" && (
          <div
            className="w-full max-w-md animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            <Card>
              <div className="flex flex-col items-center gap-4">
                <div className="inline-flex items-center gap-2 py-3 px-5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200/50 dark:border-emerald-800/30">
                  <CheckCircleIcon
                    className="w-5 h-5"
                    aria-hidden="true"
                  />
                  <span className="font-semibold">Done!</span>
                </div>

                <p className="text-sm text-stone-400 dark:text-slate-500">
                  Saved as{" "}
                  <span className="font-medium text-stone-600 dark:text-slate-300">
                    {savedFilename}
                  </span>
                </p>

                {gameGroups.length > 0 && (
                  <Button
                    onClick={backToGallery}
                    variant="ghost"
                    icon={<ArrowUturnLeftIcon className="w-5 h-5" />}
                  >
                    Back to selection
                  </Button>
                )}

                <FolderInput
                  onFilesSelected={processFiles}
                  variant="secondary"
                  icon={<FolderIcon className="w-5 h-5" />}
                >
                  Select another folder
                </FolderInput>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Database Info */}
      <DatabaseInfo />

      {/* Footer */}
      <footer
        className="py-6 text-center relative z-[1] animate-fade-up"
        style={{ animationDelay: "0.2s" }}
      >
        <p className="text-sm text-stone-400 dark:text-slate-500">
          <span className="text-nx font-display font-bold">nx</span>
          <span className="font-display font-bold text-stone-600 dark:text-slate-300">
            shot
          </span>
          {" is "}
          <a
            href="https://github.com/pxdl/nxshot-web"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-500 dark:text-slate-400 hover:text-nx dark:hover:text-nx underline underline-offset-2 decoration-stone-300 dark:decoration-slate-600 hover:decoration-nx transition-colors"
          >
            open source
          </a>
        </p>
      </footer>
    </div>
  );
}
