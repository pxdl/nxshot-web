import { useRef, useState } from "react";
import { collectSwitchScreenshots } from "../utils/filesystem";
import { parseScreenshotFilename } from "../utils/screenshot";
import { createZip, type ZipProgress } from "../utils/zip";

export type ProcessorStatus = "idle" | "scanning" | "ready" | "processing" | "done" | "error";

export interface ScreenshotProcessorState {
  status: ProcessorStatus;
  error: string | null;
  files: FileSystemFileHandle[];
  currentFileIndex: number;
  totalFiles: number;
  processingPhase: string;
  savedFilename: string;
  scanCount: number;
}

export function useScreenshotProcessor() {
  const [state, setState] = useState<ScreenshotProcessorState>({
    status: "idle",
    error: null,
    files: [],
    currentFileIndex: 0,
    totalFiles: 0,
    processingPhase: "",
    savedFilename: "",
    scanCount: 0,
  });

  // Track current operation to prevent race conditions
  const currentOperationId = useRef(0);
  const isProcessing = useRef(false);

  const selectFolder = async () => {
    setState((prev) => ({ ...prev, error: null }));

    try {
      const dirHandle = await window.showDirectoryPicker();

      // Start new operation, invalidating any previous one
      const operationId = ++currentOperationId.current;

      setState((prev) => ({
        ...prev,
        status: "scanning",
        files: [],
        scanCount: 0,
      }));

      const screenshots = await collectSwitchScreenshots(dirHandle, (count) => {
        // Only update if this operation is still current
        if (currentOperationId.current === operationId) {
          setState((prev) => ({ ...prev, scanCount: count }));
        }
      });

      // Ignore results if a newer operation has started
      if (currentOperationId.current !== operationId) {
        return;
      }

      setState((prev) => ({
        ...prev,
        files: screenshots,
        currentFileIndex: 0,
        totalFiles: screenshots.length,
        status: screenshots.length > 0 ? "ready" : "idle",
        error: screenshots.length === 0 ? "No Nintendo Switch screenshots found in this folder." : null,
      }));
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return;
      }
      setState((prev) => ({
        ...prev,
        status: "error",
        error: "Failed to access folder. Please try again.",
      }));
    }
  };

  const downloadZip = async () => {
    // Prevent double-clicks
    if (isProcessing.current) return;
    isProcessing.current = true;

    setState((prev) => ({
      ...prev,
      status: "processing",
      error: null,
    }));

    try {
      const handleProgress = (progress: ZipProgress) => {
        setState((prev) => ({
          ...prev,
          currentFileIndex: progress.current,
          totalFiles: progress.total,
          processingPhase:
            progress.phase === "processing"
              ? "Processing files..."
              : "Finalizing...",
        }));
      };

      const filename = await createZip(state.files, parseScreenshotFilename, handleProgress);
      setState((prev) => ({
        ...prev,
        savedFilename: filename,
        status: "done",
      }));
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setState((prev) => ({ ...prev, status: "ready" }));
        return;
      }
      setState((prev) => ({
        ...prev,
        status: "error",
        error:
          e instanceof Error
            ? `Error: ${e.message}`
            : "An error occurred while creating the ZIP file.",
      }));
    } finally {
      isProcessing.current = false;
    }
  };

  const progress = state.totalFiles > 0 ? (state.currentFileIndex / state.totalFiles) * 100 : 0;

  return {
    ...state,
    progress,
    selectFolder,
    downloadZip,
  };
}
