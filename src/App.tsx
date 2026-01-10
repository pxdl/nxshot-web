import { useEffect, useState } from "react";
import {
  CameraIcon,
  CheckCircleIcon,
  FolderIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  ArrowDownTrayIcon,
  PhotoIcon,
} from "@heroicons/react/24/solid";

import { collectSwitchCaptures } from "./utils/filesystem";
import { parseScreenshotFilename } from "./utils/screenshot";
import { createZip, type ZipProgress } from "./utils/zip";

type Status = "idle" | "scanning" | "ready" | "processing" | "done" | "error";

function Spinner({ className = "w-6 h-6" }: { className?: string }) {
  return <ArrowPathIcon className={`${className} animate-spin`} />;
}

export default function App() {
  const [isCompatible, setIsCompatible] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileSystemFileHandle[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [processingPhase, setProcessingPhase] = useState<string>("");
  const [savedFilename, setSavedFilename] = useState<string>("");

  useEffect(() => {
    setIsCompatible("showDirectoryPicker" in window);
  }, []);

  async function handleSelectFolder() {
    setError(null);

    try {
      const dirHandle = await window.showDirectoryPicker();
      setStatus("scanning");

      const captures = await collectSwitchCaptures(dirHandle);
      setFiles(captures);
      setCurrentFileIndex(0);
      setTotalFiles(captures.length);
      setStatus(captures.length > 0 ? "ready" : "idle");

      if (captures.length === 0) {
        setError("No Nintendo Switch captures found in this folder.");
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return;
      }
      setStatus("error");
      setError("Failed to access folder. Please try again.");
    }
  }

  async function handleDownloadZip() {
    setStatus("processing");
    setError(null);

    try {
      const handleProgress = (progress: ZipProgress) => {
        setCurrentFileIndex(progress.current);
        setTotalFiles(progress.total);
        setProcessingPhase(
          progress.phase === "processing"
            ? "Processing files..."
            : "Finalizing..."
        );
      };

      const filename = await createZip(files, parseScreenshotFilename, handleProgress);
      setSavedFilename(filename);
      setStatus("done");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setStatus("ready");
        return;
      }
      setStatus("error");
      setError(
        e instanceof Error
          ? `Error: ${e.message}`
          : "An error occurred while creating the ZIP file."
      );
    }
  }

  const progress = totalFiles > 0 ? (currentFileIndex / totalFiles) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <CameraIcon className="w-10 h-10 md:w-14 md:h-14 text-red-500" />
            <h1 className="text-5xl md:text-7xl font-black tracking-tight">
              <span className="text-red-500">nx</span>
              <span className="text-slate-800 dark:text-white">shot</span>
            </h1>
          </div>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium">
            Organize your Nintendo Switch captures
          </p>
        </div>

        {/* Main Card */}
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200 dark:shadow-slate-900/50 p-6 md:p-8">
            {!isCompatible ? (
              <div className="text-center py-4">
                <ExclamationCircleIcon className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400">
                  Your browser is not supported.
                  <br />
                  Please use Chrome, Edge, or Opera.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Folder Selection */}
                {status !== "processing" && status !== "done" && (
                  <div className="text-center">
                    <button
                      onClick={handleSelectFolder}
                      disabled={status === "scanning"}
                      className="group relative w-full py-4 px-6 bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-600 dark:to-slate-700 hover:from-slate-800 hover:to-slate-900 dark:hover:from-slate-500 dark:hover:to-slate-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-slate-300 dark:shadow-slate-900/50 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                    >
                      <span className="flex items-center justify-center gap-3">
                        {status === "scanning" ? (
                          <Spinner className="w-5 h-5" />
                        ) : (
                          <FolderIcon className="w-5 h-5" />
                        )}
                        <span>
                          {status === "scanning"
                            ? "Scanning..."
                            : files.length > 0
                              ? "Select a different folder..."
                              : "Select folder"}
                        </span>
                      </span>
                    </button>

                    {status === "idle" && files.length === 0 && (
                      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                        Choose your Nintendo Switch Album folder
                      </p>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                    <div className="flex items-start gap-3">
                      <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                  </div>
                )}

                {/* File Status */}
                {files.length > 0 && (
                  <div className="flex flex-col gap-6">
                    {/* Files Found Badge */}
                    <div className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <PhotoIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {status === "ready" && <>{files.length} files found</>}
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
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
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
                      <div className="text-center">
                        <button
                          onClick={handleDownloadZip}
                          className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-red-200 dark:shadow-red-900/30 hover:shadow-xl"
                        >
                          <span className="flex items-center justify-center gap-3">
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            <span>Download as ZIP</span>
                          </span>
                        </button>
                        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                          Organized by game with correct dates
                        </p>
                      </div>
                    )}

                    {status === "processing" && (
                      <button
                        disabled
                        className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl opacity-75 cursor-not-allowed"
                      >
                        <span className="flex items-center justify-center gap-3">
                          <Spinner className="w-5 h-5" />
                          <span>Processing...</span>
                        </span>
                      </button>
                    )}

                    {status === "done" && (
                      <div className="flex flex-col items-center gap-4">
                        <div className="inline-flex items-center gap-2 py-3 px-5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl">
                          <CheckCircleIcon className="w-5 h-5" />
                          <span className="font-semibold">Done!</span>
                        </div>

                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Saved as{" "}
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {savedFilename}
                          </span>
                        </p>

                        <button
                          onClick={handleSelectFolder}
                          className="w-full py-4 px-6 bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-600 dark:to-slate-700 hover:from-slate-800 hover:to-slate-900 dark:hover:from-slate-500 dark:hover:to-slate-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-slate-300 dark:shadow-slate-900/50 hover:shadow-xl"
                        >
                          <span className="flex items-center justify-center gap-3">
                            <FolderIcon className="w-5 h-5" />
                            <span>Select another folder</span>
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <span className="text-red-500 font-semibold">nx</span>
          <span className="font-semibold">shot</span>
          {" is "}
          <a
            href="https://github.com/s1cp/nxshot-web"
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
