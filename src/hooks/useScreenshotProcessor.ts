import { useRef, useState } from "react";
import { filterSwitchScreenshots } from "../utils/filesystem";
import { parseScreenshotFilename } from "../utils/screenshot";
import { loadCaptureIds } from "../utils/captureIds";
import { createZip, type ZipProgress } from "../utils/zip";

export type ProcessorStatus =
  | "idle"
  | "scanning"
  | "ready"
  | "loading"
  | "processing"
  | "done"
  | "error";

export interface ScreenshotProcessorState {
  status: ProcessorStatus;
  error: string | null;
  files: File[];
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

  /**
   * Process files selected from the folder input.
   * Filters for Nintendo Switch screenshots and updates state.
   */
  const processFiles = (selectedFiles: File[]) => {
    setState((prev) => ({ ...prev, error: null }));

    // Start new operation, invalidating any previous one
    const operationId = ++currentOperationId.current;

    setState((prev) => ({
      ...prev,
      status: "scanning",
      files: [],
      scanCount: 0,
    }));

    // Filter files synchronously (fast operation)
    const screenshots = filterSwitchScreenshots(selectedFiles, (count) => {
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
      error:
        screenshots.length === 0
          ? "No Nintendo Switch screenshots found in this folder."
          : null,
    }));
  };

  const downloadZip = async () => {
    // Prevent double-clicks
    if (isProcessing.current) return;
    isProcessing.current = true;

    setState((prev) => ({
      ...prev,
      status: "loading",
      processingPhase: "Loading game database...",
      error: null,
    }));

    try {
      // Load capture IDs before processing
      const captureIds = await loadCaptureIds();

      setState((prev) => ({
        ...prev,
        status: "processing",
      }));

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

      // Create a parser function with capture IDs bound
      const parseWithCaptureIds = (filename: string) =>
        parseScreenshotFilename(filename, captureIds);

      const filename = await createZip(
        state.files,
        parseWithCaptureIds,
        handleProgress
      );
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

  /**
   * Reset state to allow selecting a new folder.
   */
  const reset = () => {
    setState({
      status: "idle",
      error: null,
      files: [],
      currentFileIndex: 0,
      totalFiles: 0,
      processingPhase: "",
      savedFilename: "",
      scanCount: 0,
    });
  };

  const progress =
    state.totalFiles > 0 ? (state.currentFileIndex / state.totalFiles) * 100 : 0;

  // Calculate total size of all files in bytes
  const totalSizeBytes = state.files.reduce((sum, file) => sum + file.size, 0);

  return {
    ...state,
    progress,
    totalSizeBytes,
    processFiles,
    downloadZip,
    reset,
  };
}
