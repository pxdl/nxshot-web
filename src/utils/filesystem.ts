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
 * Recursively collect File objects from a FileSystemDirectoryHandle.
 * Skips the "Organized" output directory.
 */
export async function collectFilesFromDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  onFileFound?: () => void
): Promise<File[]> {
  const filePromises: Promise<File>[] = [];
  const dirPromises: Promise<File[]>[] = [];

  for await (const entry of dirHandle.values()) {
    if (entry.kind === "file") {
      onFileFound?.();
      filePromises.push(entry.getFile());
    } else if (
      entry.kind === "directory" &&
      entry.name !== DEFAULTS.EXCLUDED_DIRECTORY
    ) {
      dirPromises.push(collectFilesFromDirectoryHandle(entry, onFileFound));
    }
  }

  const [files, nested] = await Promise.all([
    Promise.all(filePromises),
    Promise.all(dirPromises),
  ]);
  return files.concat(nested.flat());
}

/**
 * Read all entries from a FileSystemDirectoryReader.
 * readEntries() may return results in batches — call until empty.
 */
function readAllEntries(
  reader: FileSystemDirectoryReader
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const all: FileSystemEntry[] = [];
    const readBatch = () => {
      reader.readEntries((entries) => {
        if (entries.length === 0) {
          resolve(all);
        } else {
          all.push(...entries);
          readBatch();
        }
      }, reject);
    };
    readBatch();
  });
}

/**
 * Recursively collect File objects from a FileSystemEntry (drag-and-drop API).
 * Skips directories matching the excluded directory name ("Organized").
 */
export async function collectFilesFromEntry(
  entry: FileSystemEntry,
  onFileFound?: () => void
): Promise<File[]> {
  if (entry.isFile) {
    onFileFound?.();
    return [
      await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject)
      ),
    ];
  }

  if (entry.isDirectory) {
    if (entry.name === DEFAULTS.EXCLUDED_DIRECTORY) return [];
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const entries = await readAllEntries(reader);
    const nested = await Promise.all(
      entries.map((e) => collectFilesFromEntry(e, onFileFound))
    );
    return nested.flat();
  }

  return [];
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
