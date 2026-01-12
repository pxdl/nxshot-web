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

/**
 * Filter files to find Nintendo Switch screenshots.
 * Works with File objects from <input type="file" webkitdirectory>.
 */
export function filterSwitchScreenshots(
  files: File[],
  onProgress?: (count: number) => void
): File[] {
  const screenshots: File[] = [];

  for (const file of files) {
    if (shouldExcludeFile(file)) continue;

    if (isNintendoSwitchScreenshot(file.name)) {
      screenshots.push(file);
      onProgress?.(screenshots.length);
    }
  }

  return screenshots;
}