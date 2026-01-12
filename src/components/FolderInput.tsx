import { useRef, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface FolderInputProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  children: ReactNode;
  variant?: ButtonVariant;
  icon?: ReactNode;
}

const baseStyles =
  "w-full py-4 px-6 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30 hover:shadow-xl disabled:hover:shadow-lg",
  secondary:
    "bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-600 dark:to-slate-700 hover:from-slate-800 hover:to-slate-900 dark:hover:from-slate-500 dark:hover:to-slate-600 text-white shadow-lg shadow-slate-300 dark:shadow-slate-900/50 hover:shadow-xl disabled:hover:shadow-lg",
  ghost:
    "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 shadow-lg shadow-slate-300 dark:shadow-slate-900/30 hover:shadow-xl",
};

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
        className={`${baseStyles} ${variantStyles[variant]}`}
      >
        <span className="flex items-center justify-center gap-3">
          {icon}
          <span>{children}</span>
        </span>
      </button>
    </>
  );
}
