import { useEffect, useRef, useState } from "react";
import { collectFilesFromEntry } from "../utils/filesystem";
import { loadCaptureIds } from "../utils/captureIds";
import type { FolderImportOperation } from "../types";

interface UseDropZoneOptions {
  /** When false, drag feedback indicates that imports are unavailable. */
  canAcceptDrop?: boolean;
}

/**
 * Full-page drop zone for folder drag & drop.
 * Uses webkitGetAsEntry() to recursively read dropped directories.
 * Supported in Chrome, Firefox, and Safari.
 */
export function useDropZone(
  onImportStart: () => FolderImportOperation | null,
  options: UseDropZoneOptions = {}
) {
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const fileCountRef = useRef(0);
  const dragCounterRef = useRef(0);
  const callbackRef = useRef(onImportStart);
  const operationRef = useRef<FolderImportOperation | null>(null);

  // Read the latest options from refs — the drop listener is registered once
  // (empty deps) so it must not close over stale prop values.
  const canAcceptDropRef = useRef(options.canAcceptDrop ?? true);

  useEffect(() => {
    callbackRef.current = onImportStart;
    canAcceptDropRef.current = options.canAcceptDrop ?? true;
  });

  // Sync fileCountRef → fileCount state on a 100ms interval while reading
  useEffect(() => {
    if (!isReading) return;
    const id = setInterval(() => setFileCount(fileCountRef.current), 100);
    return () => clearInterval(id);
  }, [isReading]);

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (
        canAcceptDropRef.current &&
        dragCounterRef.current === 1 &&
        e.dataTransfer?.types.includes("Files")
      ) {
        setIsDragging(true);
      }
    };

    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    };

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = canAcceptDropRef.current ? "copy" : "none";
      }
    };

    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);

      const items = e.dataTransfer?.items;
      if (!items) return;

      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i]?.webkitGetAsEntry?.();
        if (entry) entries.push(entry);
      }
      if (entries.length === 0) return;

      const operation = callbackRef.current();
      if (operation === null) return;
      operationRef.current = operation;

      loadCaptureIds().catch(() => {});
      fileCountRef.current = 0;
      setFileCount(0);

      const onFileFound = () => {
        if (operationRef.current === operation) fileCountRef.current++;
      };

      setIsReading(true);
      try {
        const allFiles = (await Promise.all(
          entries.map((entry) => collectFilesFromEntry(entry, onFileFound))
        )).flat();
        if (operationRef.current !== operation) return;
        setIsReading(false);
        await operation.complete(allFiles);
      } catch (err) {
        // getFile()/FileSystemFileEntry.file() reject on real IO failures
        // (SD card ejected mid-scan, permission revoked). Surface it instead of
        // leaving an unhandled rejection and a silently-reset spinner.
        console.error("Failed to read dropped folder:", err);
        operation.fail(
          "Couldn't read the dropped folder. If it's on an SD card, make sure it's still connected and try again."
        );
      } finally {
        if (operationRef.current === operation) {
          operationRef.current = null;
          setIsReading(false);
        }
      }
    };

    document.addEventListener("dragenter", onDragEnter);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragenter", onDragEnter);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", onDrop);
      operationRef.current?.cancel();
      operationRef.current = null;
    };
  }, []);

  return { isDragging, isReading, fileCount };
}
