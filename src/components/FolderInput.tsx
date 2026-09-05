import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  buttonBaseStyles,
  buttonVariantStyles,
  type ButtonVariant,
} from "./buttonStyles";
import { Spinner } from "./Spinner";
import { collectFilesFromDirectoryHandle } from "../utils/filesystem";
import { loadCaptureIds } from "../utils/captureIds";
import { useCyclingMessage } from "../hooks/useCyclingMessage";
import type { FolderImportOperation } from "../types";

const supportsDirectoryPicker = "showDirectoryPicker" in window;

const READING_MESSAGES = [
  "Scanning your captures...",
  "Hang tight...",
  "Digging through your Album...",
  "This can take a moment for large folders...",
  "Almost there...",
];

interface FolderInputProps {
  onImportStart: () => FolderImportOperation | null;
  disabled?: boolean;
  children: ReactNode;
  variant?: ButtonVariant;
  icon?: ReactNode;
}

/**
 * A styled folder input button that opens a directory picker.
 *
 * Uses showDirectoryPicker() when available (Chromium) for reliable recursive
 * enumeration — especially on network shares where <input webkitdirectory>
 * may miss files in deeply nested directories.
 *
 * Falls back to <input webkitdirectory> on Firefox and Safari.
 */
export function FolderInput({
  onImportStart,
  disabled = false,
  children,
  variant = "secondary",
  icon,
}: FolderInputProps) {
  const [isReading, setIsReading] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const fileCountRef = useRef(0);
  const operationRef = useRef<FolderImportOperation | null>(null);

  useEffect(() => () => {
    operationRef.current?.cancel();
    operationRef.current = null;
  }, []);

  // Sync fileCountRef → fileCount state on a 100ms interval while reading
  useEffect(() => {
    if (!isReading) return;
    const id = setInterval(() => setFileCount(fileCountRef.current), 100);
    return () => clearInterval(id);
  }, [isReading]);

  // ── showDirectoryPicker path (Chromium) ──

  const handleDirectoryPicker = async () => {
    const operation = onImportStart();
    if (operation === null) return;
    operationRef.current = operation;

    loadCaptureIds().catch(() => {});
    let dirHandle: FileSystemDirectoryHandle;
    try {
      dirHandle = await window.showDirectoryPicker();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        operation.cancel();
      } else {
        console.error("Failed to open folder:", err);
        operation.fail(
          "Couldn't read the folder. If it's on an SD card, make sure it's still connected and try again."
        );
      }
      if (operationRef.current === operation) operationRef.current = null;
      return;
    }

    if (operationRef.current !== operation) return;
    fileCountRef.current = 0;
    setFileCount(0);
    setIsReading(true);
    try {
      const files = await collectFilesFromDirectoryHandle(dirHandle, () => {
        if (operationRef.current === operation) fileCountRef.current++;
      });
      if (operationRef.current !== operation) return;
      setIsReading(false);
      await operation.complete(files);
    } catch (err) {
      // Reading a handle rejects on real IO failures (card ejected mid-scan,
      // permission revoked). Surface it instead of leaving the user staring at
      // a spinner that silently resets with nothing to show.
      console.error("Failed to read folder:", err);
      operation.fail(
        "Couldn't read the folder. If it's on an SD card, make sure it's still connected and try again."
      );
    } finally {
      if (operationRef.current === operation) {
        operationRef.current = null;
        setIsReading(false);
      }
    }
  };

  // ── <input webkitdirectory> fallback (Firefox, Safari) ──

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogOpenRef = useRef(false);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (supportsDirectoryPicker) return;

    const onFocus = () => {
      if (!dialogOpenRef.current) return;
      dialogOpenRef.current = false;
      const operation = operationRef.current;
      if (operation === null) return;

      focusTimerRef.current = setTimeout(() => {
        if (operationRef.current === operation) {
          setIsReading(true);
        }
      }, 100);
    };

    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearTimeout(focusTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (supportsDirectoryPicker) return;

    const input = inputRef.current;
    if (!input) return;
    const onCancel = () => {
      dialogOpenRef.current = false;
      clearTimeout(focusTimerRef.current);
      setIsReading(false);
      const operation = operationRef.current;
      operationRef.current = null;
      operation?.cancel();
    };
    input.addEventListener("cancel", onCancel);
    return () => input.removeEventListener("cancel", onCancel);
  }, []);

  const handleFallbackClick = () => {
    const input = inputRef.current;
    if (!input) return;
    const operation = onImportStart();
    if (operation === null) return;
    operationRef.current = operation;

    loadCaptureIds().catch(() => {});
    dialogOpenRef.current = true;
    input.click();
  };

  const handleFallbackChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    dialogOpenRef.current = false;
    clearTimeout(focusTimerRef.current);
    setIsReading(false);

    const operation = operationRef.current;
    operationRef.current = null;
    const fileList = event.target.files;
    const files = operation && fileList ? Array.from(fileList) : null;
    event.target.value = "";

    if (operation === null) return;
    if (files === null) {
      operation.cancel();
      return;
    }
    await operation.complete(files);
  };

  // ── Render ──

  const showLoading = isReading;
  const { message, visible: messageVisible } = useCyclingMessage(
    READING_MESSAGES,
    showLoading
  );

  return (
    <>
      {!supportsDirectoryPicker && (
        <input
          ref={inputRef}
          type="file"
          // @ts-expect-error webkitdirectory is non-standard but widely supported
          webkitdirectory="true"
          multiple
          onChange={handleFallbackChange}
          disabled={disabled && operationRef.current === null}
          className="hidden"
          aria-hidden="true"
        />
      )}
      <button
        type="button"
        onClick={
          supportsDirectoryPicker
            ? handleDirectoryPicker
            : handleFallbackClick
        }
        disabled={disabled || isReading}
        className={`${buttonBaseStyles} ${buttonVariantStyles[variant]}`}
      >
        <span className="flex items-center justify-center gap-3">
          {showLoading ? <Spinner className="w-5 h-5" /> : icon}
          <span>
            {showLoading ? (
              <>
                Reading...
                {fileCount > 0 && (
                  <span className="tabular-nums"> ({fileCount} found)</span>
                )}
              </>
            ) : (
              children
            )}
          </span>
        </span>
      </button>
      {showLoading && (
        <p
          className={`text-xs text-stone-500 dark:text-slate-400 text-center transition-opacity duration-300 ${messageVisible ? "opacity-100" : "opacity-0"}`}
        >
          {message}
        </p>
      )}
      {/* Stable screen-reader status: the button's "(N found)" count updates
          too fast to announce, so mirror just the reading state here. */}
      <span className="sr-only" role="status" aria-live="polite">
        {showLoading ? "Reading folder…" : ""}
      </span>
    </>
  );
}
