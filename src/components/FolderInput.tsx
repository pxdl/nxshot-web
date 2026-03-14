import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  buttonBaseStyles,
  buttonVariantStyles,
  type ButtonVariant,
} from "./Button";
import { Spinner } from "./Spinner";
import { collectFilesFromDirectoryHandle } from "../utils/filesystem";

const supportsDirectoryPicker = "showDirectoryPicker" in window;

interface FolderInputProps {
  onFilesSelected: (files: File[]) => void;
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
  onFilesSelected,
  disabled = false,
  children,
  variant = "secondary",
  icon,
}: FolderInputProps) {
  const [isReading, setIsReading] = useState(false);

  // ── showDirectoryPicker path (Chromium) ──

  const handleDirectoryPicker = async () => {
    let dirHandle: FileSystemDirectoryHandle;
    try {
      dirHandle = await window.showDirectoryPicker();
    } catch {
      // User cancelled the picker
      return;
    }

    setIsReading(true);
    try {
      const files = await collectFilesFromDirectoryHandle(dirHandle);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    } finally {
      setIsReading(false);
    }
  };

  // ── <input webkitdirectory> fallback (Firefox, Safari) ──

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogOpenRef = useRef(false);
  const cancelledRef = useRef(false);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (supportsDirectoryPicker) return;

    const onFocus = () => {
      if (!dialogOpenRef.current) return;
      dialogOpenRef.current = false;

      focusTimerRef.current = setTimeout(() => {
        if (!cancelledRef.current) {
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
      cancelledRef.current = true;
      clearTimeout(focusTimerRef.current);
      setIsReading(false);
    };
    input.addEventListener("cancel", onCancel);
    return () => input.removeEventListener("cancel", onCancel);
  }, []);

  const handleFallbackClick = () => {
    cancelledRef.current = false;
    dialogOpenRef.current = true;
    inputRef.current?.click();
  };

  const handleFallbackChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    clearTimeout(focusTimerRef.current);
    setIsReading(false);

    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    onFilesSelected(Array.from(fileList));
    event.target.value = "";
  };

  // ── Render ──

  const showLoading = isReading && !disabled;

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
          disabled={disabled}
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
          <span>{showLoading ? "Reading folder..." : children}</span>
        </span>
      </button>
    </>
  );
}
