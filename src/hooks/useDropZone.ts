import { useEffect, useRef, useState } from "react";
import { collectFilesFromEntry } from "../utils/filesystem";
import { loadCaptureIds } from "../utils/captureIds";

/**
 * Full-page drop zone for folder drag & drop.
 * Uses webkitGetAsEntry() to recursively read dropped directories.
 * Supported in Chrome, Firefox, and Safari.
 */
export function useDropZone(onFilesCollected: (files: File[]) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const fileCountRef = useRef(0);
  const dragCounterRef = useRef(0);
  const callbackRef = useRef(onFilesCollected);
  callbackRef.current = onFilesCollected;

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
        e.dataTransfer.dropEffect = "copy";
      }
    };

    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      loadCaptureIds().catch(() => {});

      const items = e.dataTransfer?.items;
      if (!items) return;

      fileCountRef.current = 0;
      setFileCount(0);

      const onFileFound = () => {
        fileCountRef.current++;
      };

      const promises: Promise<File[]>[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i]?.webkitGetAsEntry?.();
        if (entry) {
          promises.push(collectFilesFromEntry(entry, onFileFound));
        }
      }

      if (promises.length === 0) return;

      setIsReading(true);
      try {
        const allFiles = (await Promise.all(promises)).flat();
        if (allFiles.length > 0) {
          callbackRef.current(allFiles);
        }
      } finally {
        setIsReading(false);
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
    };
  }, []);

  return { isDragging, isReading, fileCount };
}
