import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { filterSwitchScreenshots } from "../utils/filesystem";
import {
  parseScreenshotFilename,
  groupFilesByGame,
  getZipPath,
} from "../utils/screenshot";
import { loadCaptureIds } from "../utils/captureIds";
import type { ZipProgress } from "../utils/zip";
import type {
  CaptureIds,
  FolderImportOperation,
  FolderStructure,
  GameGroup,
  Screenshot,
} from "../types";

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
  isBusy: boolean;
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
    isBusy: false,
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

  // One synchronous owner spans folder reading, scanning, and ZIP export.
  const currentOperationId = useRef(0);
  const activeOperationId = useRef<number | null>(null);
  const captureIdsRef = useRef<CaptureIds>({});

  const ownsOperation = useCallback(
    (id: number) => activeOperationId.current === id,
    [],
  );

  const beginOperation = useCallback((): number | null => {
    if (activeOperationId.current !== null) return null;
    const id = ++currentOperationId.current;
    activeOperationId.current = id;
    setState((prev) => ({ ...prev, isBusy: true, error: null }));
    return id;
  }, []);

  const finishOperation = useCallback((id: number) => {
    if (activeOperationId.current !== id) return;
    activeOperationId.current = null;
    setState((prev) => ({ ...prev, isBusy: false }));
  }, []);

  useEffect(() => () => {
    currentOperationId.current++;
    activeOperationId.current = null;
  }, []);

  /**
   * Process files selected from the folder input.
   * Filters for Nintendo Switch screenshots, loads capture IDs,
   * and groups files by game.
   */
  const processFiles = useCallback(
    async (selectedFiles: File[], operationId: number) => {
      if (!ownsOperation(operationId)) return;

      setState((prev) => ({
        ...prev,
        status: "scanning",
        scanCount: 0,
      }));
      setGameGroups([]);
      setSelectedGames(new Set());

      const screenshots = await filterSwitchScreenshots(selectedFiles, (count) => {
        if (ownsOperation(operationId)) {
          setState((prev) => ({ ...prev, scanCount: count }));
        }
      });

      if (!ownsOperation(operationId)) return;

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

      if (!ownsOperation(operationId)) return;

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
    },
    [ownsOperation],
  );

  const beginImport = useCallback((): FolderImportOperation | null => {
    const id = beginOperation();
    if (id === null) return null;
    let settled = false;

    return {
      complete: async (files) => {
        if (settled || !ownsOperation(id)) return;
        settled = true;
        try {
          await processFiles(files, id);
        } catch (error) {
          if (ownsOperation(id)) {
            setState((prev) => ({
              ...prev,
              status: "idle",
              error: error instanceof Error
                ? `Error: ${error.message}`
                : "Couldn't process the selected folder.",
            }));
          }
        } finally {
          finishOperation(id);
        }
      },
      fail: (message) => {
        if (settled || !ownsOperation(id)) return;
        settled = true;
        setState((prev) => ({ ...prev, error: message }));
        finishOperation(id);
      },
      cancel: () => {
        if (settled || !ownsOperation(id)) return;
        settled = true;
        finishOperation(id);
      },
    };
  }, [beginOperation, finishOperation, ownsOperation, processFiles]);

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

  const downloadZip = useCallback(async () => {
    if (activeOperationId.current !== null) return;

    // Get files from selected games only
    const filesToExport = gameGroups
      .filter((g) => selectedGames.has(g.gameName))
      .flatMap((g) => g.files.map((f) => f.file));

    if (filesToExport.length === 0) return;

    const id = beginOperation();
    if (id === null) return;
    const exportCaptureIds = captureIdsRef.current;
    const exportFolderStructure = folderStructure;

    setState((prev) => ({
      ...prev,
      status: "loading",
      processingPhase: "Preparing download...",
      // Reset counters so a repeat download doesn't briefly flash the previous
      // run's 100% bar and stale counts before the first file reports progress.
      currentFileIndex: 0,
      totalFiles: filesToExport.length,
    }));

    let progressFrame: number | null = null;
    let latestProgress: ZipProgress | null = null;

    const commitProgress = (progress: ZipProgress) => {
      if (!ownsOperation(id)) return;
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
        if (!ownsOperation(id)) return;
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
        parseScreenshotFilename(filename, exportCaptureIds);

      const pathGenerator = (screenshot: Screenshot, originalFilename: string) =>
        getZipPath(screenshot, originalFilename, exportFolderStructure);

      // Preserve the gallery-prewarmed chunk; a static import loads ZIP code up front.
      const { createZip } = await import("../utils/zip");
      if (!ownsOperation(id)) return;
      const filename = await createZip(
        filesToExport,
        parseWithCaptureIds,
        pathGenerator,
        handleProgress
      );
      if (!ownsOperation(id)) return;
      setState((prev) => ({
        ...prev,
        savedFilename: filename,
        status: "done",
      }));
    } catch (e) {
      if (!ownsOperation(id)) return;
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
      finishOperation(id);
    }
  }, [
    beginOperation,
    finishOperation,
    folderStructure,
    gameGroups,
    ownsOperation,
    selectedGames,
  ]);

  /**
   * Return to gallery view from done state,
   * preserving game groups and selection.
   */
  const backToGallery = useCallback(() => {
    if (activeOperationId.current !== null) return;
    setState((prev) => ({
      ...prev,
      status: "ready",
      error: null,
    }));
  }, []);

  /**
   * Reset state to allow selecting a new folder.
   */
  const reset = useCallback(() => {
    currentOperationId.current++;
    activeOperationId.current = null;
    setState({
      status: "idle",
      isBusy: false,
      error: null,
      currentFileIndex: 0,
      totalFiles: 0,
      processingPhase: "",
      savedFilename: "",
      scanCount: 0,
    });
    setGameGroups([]);
    setSelectedGames(new Set());
  }, []);

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
    beginImport,
    downloadZip,
    toggleGame,
    selectAll,
    deselectAll,
    backToGallery,
    reset,
  };
}
