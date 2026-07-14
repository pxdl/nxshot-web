import { useCallback, useMemo, useRef, useState } from "react";
import { filterSwitchScreenshots } from "../utils/filesystem";
import {
  parseScreenshotFilename,
  groupFilesByGame,
  getZipPath,
} from "../utils/screenshot";
import { loadCaptureIds } from "../utils/captureIds";
import type { ZipProgress } from "../utils/zip";
import type { CaptureIds, FolderStructure, GameGroup, Screenshot } from "../types";

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
    currentFileIndex: 0,
    totalFiles: 0,
    processingPhase: "",
    savedFilename: "",
    scanCount: 0,
  });

  const [gameGroups, setGameGroups] = useState<GameGroup[]>([]);
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set());
  const [folderStructure, setFolderStructure] =
    useState<FolderStructure>("by-game");

  // Track current operation to prevent race conditions
  const currentOperationId = useRef(0);
  const isProcessing = useRef(false);
  const captureIdsRef = useRef<CaptureIds>({});

  /**
   * Process files selected from the folder input.
   * Filters for Nintendo Switch screenshots, loads capture IDs,
   * and groups files by game.
   */
  const processFiles = async (selectedFiles: File[]) => {
    setState((prev) => ({ ...prev, error: null }));

    // Start new operation, invalidating any previous one
    const operationId = ++currentOperationId.current;

    setState((prev) => ({
      ...prev,
      status: "scanning",
      scanCount: 0,
    }));
    setGameGroups([]);
    setSelectedGames(new Set());

    const screenshots = await filterSwitchScreenshots(selectedFiles, (count) => {
      if (currentOperationId.current === operationId) {
        setState((prev) => ({ ...prev, scanCount: count }));
      }
    });

    // Ignore results if a newer operation has started
    if (currentOperationId.current !== operationId) return;

    if (screenshots.length === 0) {
      setState((prev) => ({
        ...prev,
        status: "idle",
        error: "No Nintendo Switch screenshots found in this folder.",
      }));
      return;
    }

    // Load capture IDs (fallback to empty if fetch fails)
    let captureIds: CaptureIds = {};
    let loadError = false;

    try {
      captureIds = await loadCaptureIds();
    } catch (e) {
      console.error("Failed to load capture IDs:", e);
      loadError = true;
    }

    if (currentOperationId.current !== operationId) return;

    captureIdsRef.current = captureIds;
    const groups = groupFilesByGame(screenshots, captureIds);

    if (groups.length === 0) {
      // Files matched the capture name pattern but none parsed into a valid
      // date, so every one was dropped during grouping. Without this guard the
      // app lands in "ready" with zero groups and no branch of App renders —
      // a dead end that only a page refresh escapes.
      setGameGroups([]);
      setSelectedGames(new Set());
      setState((prev) => ({
        ...prev,
        status: "idle",
        error:
          "Found files that look like Switch captures, but none could be read. They may have been renamed or corrupted.",
      }));
      return;
    }

    setGameGroups(groups);
    setSelectedGames(new Set(groups.map((g) => g.gameName)));

    setState((prev) => ({
      ...prev,
      currentFileIndex: 0,
      totalFiles: screenshots.length,
      status: "ready",
      error: loadError
        ? "Failed to load game database. Games will appear as 'Unknown'."
        : null,
    }));
  };

  /**
   * Surface an error from an external read path (drag-and-drop, folder input)
   * through the shared error channel so the UI can show it.
   */
  const reportError = (message: string) => {
    setState((prev) => ({ ...prev, error: message }));
  };

  const toggleGame = useCallback((gameName: string) => {
    setSelectedGames((prev) => {
      const next = new Set(prev);
      if (next.has(gameName)) {
        next.delete(gameName);
      } else {
        next.add(gameName);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedGames(new Set(gameGroups.map((g) => g.gameName)));
  }, [gameGroups]);

  const deselectAll = useCallback(() => {
    setSelectedGames(new Set());
  }, []);

  const downloadZip = async () => {
    // Prevent double-clicks
    if (isProcessing.current) return;
    isProcessing.current = true;

    // Get files from selected games only
    const filesToExport = gameGroups
      .filter((g) => selectedGames.has(g.gameName))
      .flatMap((g) => g.files.map((f) => f.file));

    if (filesToExport.length === 0) {
      isProcessing.current = false;
      return;
    }

    setState((prev) => ({
      ...prev,
      status: "loading",
      processingPhase: "Preparing download...",
      // Reset counters so a repeat download doesn't briefly flash the previous
      // run's 100% bar and stale counts before the first file reports progress.
      currentFileIndex: 0,
      totalFiles: filesToExport.length,
      error: null,
    }));

    let progressFrame: number | null = null;
    let latestProgress: ZipProgress | null = null;

    const commitProgress = (progress: ZipProgress) => {
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

    try {
      setState((prev) => ({
        ...prev,
        status: "processing",
      }));

      const handleProgress = (progress: ZipProgress) => {
        latestProgress = progress;
        if (progressFrame !== null) return;
        progressFrame = requestAnimationFrame(() => {
          progressFrame = null;
          const nextProgress = latestProgress;
          latestProgress = null;
          if (nextProgress) commitProgress(nextProgress);
        });
      };

      const parseWithCaptureIds = (filename: string) =>
        parseScreenshotFilename(filename, captureIdsRef.current);

      const pathGenerator = (screenshot: Screenshot, originalFilename: string) =>
        getZipPath(screenshot, originalFilename, folderStructure);

      const { createZip } = await import("../utils/zip");
      const filename = await createZip(
        filesToExport,
        parseWithCaptureIds,
        pathGenerator,
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
        status: "ready",
        error:
          e instanceof Error
            ? `Error: ${e.message}`
            : "An error occurred while creating the ZIP file.",
      }));
    } finally {
      if (progressFrame !== null) cancelAnimationFrame(progressFrame);
      isProcessing.current = false;
    }
  };

  /**
   * Return to gallery view from done state,
   * preserving game groups and selection.
   */
  const backToGallery = () => {
    setState((prev) => ({
      ...prev,
      status: "ready",
      error: null,
    }));
  };

  /**
   * Reset state to allow selecting a new folder.
   */
  const reset = () => {
    setState({
      status: "idle",
      error: null,
      currentFileIndex: 0,
      totalFiles: 0,
      processingPhase: "",
      savedFilename: "",
      scanCount: 0,
    });
    setGameGroups([]);
    setSelectedGames(new Set());
  };

  const progress =
    state.totalFiles > 0
      ? (state.currentFileIndex / state.totalFiles) * 100
      : 0;

  const { selectedFileCount, selectedSizeBytes, totalFileCount } = useMemo(() => {
    let count = 0;
    let bytes = 0;
    let total = 0;
    for (const group of gameGroups) {
      total += group.files.length;
      if (selectedGames.has(group.gameName)) {
        count += group.files.length;
        for (const f of group.files) {
          bytes += f.file.size;
        }
      }
    }
    return { selectedFileCount: count, selectedSizeBytes: bytes, totalFileCount: total };
  }, [gameGroups, selectedGames]);

  return {
    ...state,
    progress,
    selectedFileCount,
    selectedSizeBytes,
    totalFileCount,
    gameGroups,
    selectedGames,
    folderStructure,
    setFolderStructure,
    processFiles,
    downloadZip,
    toggleGame,
    selectAll,
    deselectAll,
    backToGallery,
    reset,
    reportError,
  };
}
