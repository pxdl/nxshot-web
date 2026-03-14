import { FILENAME, VALID_EXTENSIONS, DEFAULTS } from "../constants";

/**
 * Check if a filename matches Nintendo Switch screenshot naming convention.
 */
export function isNintendoSwitchScreenshot(filename: string): boolean {
  return (
    filename.length === FILENAME.TOTAL_LENGTH &&
    VALID_EXTENSIONS.some((ext) => filename.endsWith(ext))
  );
}

/**
 * Check if a file path should be excluded (e.g., inside "Organized" folder).
 */
function shouldExcludeFile(file: File): boolean {
  const relativePath = file.webkitRelativePath || file.name;
  const pathParts = relativePath.split("/");

  // Exclude files inside the "Organized" directory
  return pathParts.some((part) => part === DEFAULTS.EXCLUDED_DIRECTORY);
}

/** Yield to the browser so React can paint. */
const yieldToMain = () => new Promise<void>((r) => setTimeout(r, 0));

/** How many files to process before yielding to the main thread. */
const YIELD_BATCH_SIZE = 2000;

/**
 * Filter files to find Nintendo Switch screenshots.
 * Works with File objects from <input type="file" webkitdirectory>.
 * Yields to the main thread periodically so the browser can render updates.
 */
export async function filterSwitchScreenshots(
  files: File[],
  onProgress?: (count: number) => void
): Promise<File[]> {
  const screenshots: File[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    if (shouldExcludeFile(file)) continue;

    if (isNintendoSwitchScreenshot(file.name)) {
      screenshots.push(file);
    }

    if (i % YIELD_BATCH_SIZE === YIELD_BATCH_SIZE - 1) {
      onProgress?.(screenshots.length);
      await yieldToMain();
    }
  }

  onProgress?.(screenshots.length);
  return screenshots;
}
