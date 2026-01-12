import { useRef, type ReactNode } from "react";
import {
  buttonBaseStyles,
  buttonVariantStyles,
  type ButtonVariant,
} from "./Button";

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
 */
export function FolderInput({
  onFilesSelected,
  disabled = false,
  children,
  variant = "secondary",
  icon,
}: FolderInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    // Convert FileList to array
    const files = Array.from(fileList);
    onFilesSelected(files);

    // Reset input so the same folder can be selected again
    event.target.value = "";
  };

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
        disabled={disabled}
        className={`${buttonBaseStyles} ${buttonVariantStyles[variant]}`}
      >
        <span className="flex items-center justify-center gap-3">
          {icon}
          <span>{children}</span>
        </span>
      </button>
    </>
  );
}
