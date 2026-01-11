import { FILENAME, VALID_EXTENSIONS, DEFAULTS } from "../constants";

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

export function isNintendoSwitchScreenshot(filename: string): boolean {
  return (
    filename.length === FILENAME.TOTAL_LENGTH &&
    VALID_EXTENSIONS.some((ext) => filename.endsWith(ext))
  );
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
