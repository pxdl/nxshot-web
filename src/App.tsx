import { useEffect, useState } from "react";
import {
  CameraIcon,
  CheckCircleIcon,
  FolderIcon,
  ExclamationCircleIcon,
  ArrowDownTrayIcon,
  PhotoIcon,
} from "@heroicons/react/24/solid";

import { Button } from "./components/Button";
import { DatabaseInfo } from "./components/DatabaseInfo";
import { FolderStructureGuide } from "./components/FolderStructureGuide";
import { Spinner } from "./components/Spinner";
import { ThemeToggle } from "./components/ThemeToggle";
import { useScreenshotProcessor } from "./hooks";

export default function App() {
  const [isCompatible, setIsCompatible] = useState(false);

  const {
    status,
    error,
    files,
    currentFileIndex,
    totalFiles,
    processingPhase,
    savedFilename,
    scanCount,
    progress,
    selectFolder,
    downloadZip,
  } = useScreenshotProcessor();

  useEffect(() => {
    setIsCompatible("showDirectoryPicker" in window);
  }, []);

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col overflow-auto relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-end justify-center gap-2 mb-3">
            <CameraIcon className="w-10 h-10 md:w-14 md:h-14 text-red-500" aria-hidden="true" />
            <h1 className="text-5xl md:text-7xl font-black tracking-tight">
              <span className="text-red-500">nx</span>
              <span className="text-slate-800 dark:text-white">shot</span>
            </h1>
          </div>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium">
            Organize your Nintendo Switch screenshots
          </p>
        </div>

        {/* Main Card */}
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200 dark:shadow-slate-900/50 p-6 md:p-8">
            {!isCompatible ? (
              <div className="text-center py-4">
                <ExclamationCircleIcon className="w-12 h-12 text-amber-500 mx-auto mb-3" aria-hidden="true" />
                <p className="text-slate-600 dark:text-slate-400">
                  Your browser is not supported.
                  <br />
                  Please use Chrome, Edge, or Opera.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Initial Folder Selection */}
                {(status === "idle" || status === "scanning") && (
                  <div className="flex flex-col gap-5">
                    {status === "idle" && files.length === 0 && <FolderStructureGuide />}

                    <Button
                      onClick={selectFolder}
                      disabled={status === "scanning"}
                      variant="secondary"
                      icon={status === "scanning" ? <Spinner className="w-5 h-5" /> : <FolderIcon className="w-5 h-5" />}
                    >
                      {status === "scanning"
                        ? `Scanning... ${scanCount > 0 ? `(${scanCount} found)` : ""}`
                        : "Select folder"}
                    </Button>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div
                    role="alert"
                    className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800"
                  >
                    <div className="flex items-start gap-3">
                      <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                  </div>
                )}

                {/* File Status */}
                {files.length > 0 && (
                  <div className="flex flex-col gap-6">
                    {/* Files Found Badge */}
                    <div
                      aria-live="polite"
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-200 dark:bg-slate-700 rounded-xl"
                    >
                      <PhotoIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {status === "ready" && <>{files.length} files found</>}
                        {status === "loading" && <>{processingPhase}</>}
                        {status === "processing" && (
                          <>
                            {processingPhase} ({currentFileIndex}/{totalFiles})
                          </>
                        )}
                        {status === "done" && <>{files.length} files processed</>}
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
                          className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"
                        >
                          <div
                            className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
                          {Math.round(progress)}% complete
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {status === "ready" && (
                      <div className="flex flex-col gap-4">
                        <div>
                          <Button
                            onClick={downloadZip}
                            variant="primary"
                            icon={<ArrowDownTrayIcon className="w-5 h-5" />}
                          >
                            Download as ZIP
                          </Button>
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">
                            Organized by game with correct dates
                          </p>
                        </div>

                        <Button
                          onClick={selectFolder}
                          variant="ghost"
                          icon={<FolderIcon className="w-5 h-5" />}
                        >
                          Select a different folder
                        </Button>
                      </div>
                    )}

                    {(status === "loading" || status === "processing") && (
                      <Button
                        disabled
                        variant="primary"
                        icon={<Spinner className="w-5 h-5" />}
                      >
                        {status === "loading" ? "Loading..." : "Processing..."}
                      </Button>
                    )}

                    {status === "done" && (
                      <div className="flex flex-col items-center gap-4">
                        <div className="inline-flex items-center gap-2 py-3 px-5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl">
                          <CheckCircleIcon className="w-5 h-5" aria-hidden="true" />
                          <span className="font-semibold">Done!</span>
                        </div>

                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Saved as{" "}
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {savedFilename}
                          </span>
                        </p>

                        <Button
                          onClick={selectFolder}
                          variant="secondary"
                          icon={<FolderIcon className="w-5 h-5" />}
                        >
                          Select another folder
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Database Info */}
      <DatabaseInfo />

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <span className="text-red-500 font-semibold">nx</span>
          <span className="font-semibold">shot</span>
          {" is "}
          <a
            href="https://github.com/pxdl/nxshot-web"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 underline underline-offset-2 transition-colors"
          >
            open source
          </a>
        </p>
      </footer>
    </div>
  );
}
