import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  buttonBaseStyles,
  buttonVariantStyles,
  type ButtonVariant,
} from "./Button";
import { Spinner } from "./Spinner";

interface FolderInputProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  children: ReactNode;
  variant?: ButtonVariant;
  icon?: ReactNode;
}

/**
 * A styled folder input button that allows folder selection.
 * Works across all major browsers (Chrome, Firefox, Safari, Edge).
 * Uses webkitdirectory attribute for folder selection.
 *
 * Shows a loading state after the native folder picker closes while
 * the browser enumerates the directory (the slow part for NAS/network shares).
 * The loading state is triggered by window regaining focus after the
 * native dialog, not on the initial button click.
 */
export function FolderInput({
  onFilesSelected,
  disabled = false,
  children,
  variant = "secondary",
  icon,
}: FolderInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isWaitingForFiles, setIsWaitingForFiles] = useState(false);

  // Whether the native file dialog is currently open
  const dialogOpenRef = useRef(false);
  // Whether the dialog was cancelled (to avoid a brief loading flash)
  const cancelledRef = useRef(false);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // When the native dialog closes, the window regains focus.
  // Show loading after a short debounce (avoids flash if user cancelled).
  useEffect(() => {
    const onFocus = () => {
      if (!dialogOpenRef.current) return;
      dialogOpenRef.current = false;

      // Short delay so a cancel event can fire first
      focusTimerRef.current = setTimeout(() => {
        if (!cancelledRef.current) {
          setIsWaitingForFiles(true);
        }
      }, 100);
    };

    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearTimeout(focusTimerRef.current);
    };
  }, []);

  // Listen for the cancel event (user dismissed the file/confirmation dialog)
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const onCancel = () => {
      cancelledRef.current = true;
      clearTimeout(focusTimerRef.current);
      setIsWaitingForFiles(false);
    };
    input.addEventListener("cancel", onCancel);
    return () => input.removeEventListener("cancel", onCancel);
  }, []);

  const handleClick = () => {
    cancelledRef.current = false;
    dialogOpenRef.current = true;
    inputRef.current?.click();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    clearTimeout(focusTimerRef.current);
    setIsWaitingForFiles(false);

    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    onFilesSelected(files);

    // Reset input so the same folder can be selected again
    event.target.value = "";
  };

  const showLoading = isWaitingForFiles && !disabled;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        // @ts-expect-error webkitdirectory is non-standard but widely supported
        webkitdirectory="true"
        multiple
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isWaitingForFiles}
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
