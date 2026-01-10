export async function* getFilesRecursively(
  entry: FileSystemDirectoryHandle | FileSystemFileHandle
): AsyncGenerator<FileSystemFileHandle> {
  if (entry.kind === "file") {
    const file = await entry.getFile();
    if (file !== null) {
      yield entry;
    }
  } else if (entry.kind === "directory" && entry.name !== "Organized") {
    for await (const handle of entry.values()) {
      yield* getFilesRecursively(handle);
    }
  }
}

const SWITCH_FILENAME_LENGTH = 53;

export function isNintendoSwitchCapture(filename: string): boolean {
  return (
    filename.length === SWITCH_FILENAME_LENGTH &&
    (filename.endsWith(".jpg") || filename.endsWith(".mp4"))
  );
}

export async function collectSwitchCaptures(
  directory: FileSystemDirectoryHandle
): Promise<FileSystemFileHandle[]> {
  const files: FileSystemFileHandle[] = [];

  for await (const fileHandle of getFilesRecursively(directory)) {
    if (isNintendoSwitchCapture(fileHandle.name)) {
      files.push(fileHandle);
    }
  }

  return files;
}
