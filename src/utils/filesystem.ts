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

// ============================================================================
// Legacy File System Access API support (Chromium only)
// These functions are kept for potential future use with native directory picker
// ============================================================================

export async function* getFilesRecursively(
  entry: FileSystemDirectoryHandle | FileSystemFileHandle
): AsyncGenerator<FileSystemFileHandle> {
  try {
    if (entry.kind === "file") {
      // Verify file is accessible before yielding
      await entry.getFile();
      yield entry;
    } else if (entry.kind === "directory" && entry.name !== DEFAULTS.EXCLUDED_DIRECTORY) {
      for await (const handle of entry.values()) {
        yield* getFilesRecursively(handle);
      }
    }
  } catch {
    // Skip inaccessible files/directories (permission denied, deleted, etc.)
    // Continue processing other files rather than failing entirely
  }
}

export async function collectSwitchScreenshots(
  directory: FileSystemDirectoryHandle,
  onProgress?: (count: number) => void
): Promise<FileSystemFileHandle[]> {
  const files: FileSystemFileHandle[] = [];

  for await (const fileHandle of getFilesRecursively(directory)) {
    if (isNintendoSwitchScreenshot(fileHandle.name)) {
      files.push(fileHandle);
      onProgress?.(files.length);
    }
  }

  return files;
}
