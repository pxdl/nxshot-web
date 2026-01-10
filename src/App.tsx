import { useEffect, useState } from "react";
import {
  CameraIcon,
  CheckIcon,
  DocumentIcon,
  FolderIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
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
        // User cancelled the save dialog
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
    <main className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4">
      <div className="flex flex-row items-center justify-center">
        <CameraIcon className="w-10 h-10 mt-2 mr-1 md:w-16 md:h-16 md:mt-4 md:mr-2 text-gray-800 dark:text-gray-300" />
        <h1 className="text-5xl md:text-[5rem] leading-normal font-extrabold text-gray-800 dark:text-gray-300">
          <span className="text-red-600">nx</span>shot
        </h1>
      </div>

      <p className="text-2xl text-gray-800 dark:text-gray-300 text-center">
        Automatically organize your Nintendo Switch captures
      </p>

      {!isCompatible ? (
        <div className="flex flex-col items-center mt-8">
          <p className="text-gray-600 text-center">
            Your browser is not supported. Please use Chrome, Edge, or Opera.
          </p>
        </div>
      ) : (
        <>
          {/* Folder Selection - hidden during processing and done */}
          {status !== "processing" && status !== "done" && (
            <div className="flex flex-col items-center mt-8 gap-2">
              <button
                onClick={handleSelectFolder}
                disabled={status === "scanning"}
                className="dark:text-gray-900 text-gray-100 font-bold dark:bg-gray-300 bg-gray-700 dark:hover:bg-gray-400 hover:bg-gray-800 dark:active:bg-gray-500 active:bg-gray-900 focus:outline-none focus:ring dark:focus:ring-gray-100 focus:ring-gray-500 py-2 px-4 drop-shadow-xl rounded-md inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "scanning" ? (
                  <Spinner className="w-6 h-6 mr-2" />
                ) : (
                  <FolderIcon className="w-6 h-6 mr-2" />
                )}
                <span>
                  {status === "scanning"
                    ? "Scanning..."
                    : files.length > 0
                      ? "Select a different folder..."
                      : "Select folder..."}
                </span>
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex flex-row items-center justify-center mt-6 text-red-600 dark:text-red-400">
              <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
              <p className="text-center">{error}</p>
            </div>
          )}

          {/* File Status */}
          {files.length > 0 && (
            <>
              <div className="flex flex-row items-center justify-center mt-8">
                <DocumentIcon className="w-6 h-6 mr-2 text-gray-800 dark:text-gray-300" />
                <p className="text-gray-600 text-center">
                  {status === "ready" && <>{files.length} files found</>}
                  {status === "processing" && (
                    <>
                      {processingPhase} ({currentFileIndex} of {totalFiles})
                    </>
                  )}
                  {status === "done" && (
                    <>All {files.length} files processed</>
                  )}
                </p>
              </div>

              {/* Progress Bar */}
              {status === "processing" && (
                <div className="w-full max-w-md mt-4">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              {status === "ready" && (
                <div className="flex flex-col items-center mt-8 gap-2">
                  <button
                    onClick={handleDownloadZip}
                    className="inline-flex items-center py-2 px-4 drop-shadow-xl rounded-md text-gray-100 font-bold bg-red-600 hover:bg-red-700 active:bg-red-800 focus:ring-red-400 focus:outline-none focus:ring"
                  >
                    <ArrowDownTrayIcon className="w-6 h-6 mr-2" />
                    <span>Download as ZIP</span>
                  </button>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Files will be organized by game with correct dates
                  </p>
                </div>
              )}

              {status === "processing" && (
                <div className="flex flex-col items-center mt-8">
                  <button
                    disabled
                    className="inline-flex items-center py-2 px-4 drop-shadow-xl rounded-md text-gray-100 font-bold bg-red-600 opacity-50 cursor-not-allowed"
                  >
                    <Spinner className="w-6 h-6 mr-2" />
                    <span>Processing...</span>
                  </button>
                </div>
              )}

              {status === "done" && (
                <div className="flex flex-col items-center mt-8 gap-4">
                  <div className="inline-flex items-center py-2 px-4 rounded-md text-gray-100 font-bold bg-green-600">
                    <CheckIcon className="w-6 h-6 mr-2" />
                    <span>Done!</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Saved as <span className="font-medium text-gray-700 dark:text-gray-300">{savedFilename}</span>
                  </p>
                  <button
                    onClick={handleSelectFolder}
                    className="inline-flex items-center py-2 px-4 drop-shadow-xl rounded-md dark:text-gray-900 text-gray-100 font-bold dark:bg-gray-300 bg-gray-700 dark:hover:bg-gray-400 hover:bg-gray-800 dark:active:bg-gray-500 active:bg-gray-900 focus:outline-none focus:ring dark:focus:ring-gray-100 focus:ring-gray-500"
                  >
                    <FolderIcon className="w-6 h-6 mr-2" />
                    <span>Select another folder</span>
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      <footer className="mt-8">
        <p className="text-gray-600 text-center">
          <span className="text-red-600">nx</span>shot is a{" "}
          <a
            href="https://github.com/s1cp/nxshot-web"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-800 dark:hover:text-gray-400"
          >
            work in progress
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
