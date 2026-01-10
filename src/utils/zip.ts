import { Zip, ZipPassThrough } from "fflate";
import type { Screenshot } from "../types";

/**
 * Create a Date object from screenshot metadata.
 */
export function screenshotToDate(screenshot: Screenshot): Date {
  return new Date(
    screenshot.year,
    screenshot.month,
    screenshot.day,
    screenshot.hour,
    screenshot.minute,
    screenshot.second
  );
}

export interface ZipProgress {
  current: number;
  total: number;
  phase: "processing" | "finalizing";
}

export type ProgressCallback = (progress: ZipProgress) => void;

/**
 * Create and save a ZIP file with proper dates using fflate.
 * Streams directly to disk to handle large files.
 * Returns the saved filename.
 */
export async function createZip(
  files: FileSystemFileHandle[],
  parseFilename: (filename: string) => Screenshot,
  onProgress?: ProgressCallback
): Promise<string> {
  // Let user choose where to save
  const saveHandle = await window.showSaveFilePicker({
    suggestedName: "Nintendo Switch Captures.zip",
    types: [
      {
        description: "ZIP Archive",
        accept: { "application/zip": [".zip"] },
      },
    ],
  });

  const writableStream = await saveHandle.createWritable();
  const total = files.length;

  // Collect chunks synchronously, flush after each file
  let pendingChunks: Uint8Array[] = [];
  let error: Error | null = null;

  const zip = new Zip((err, chunk, _final) => {
    if (err) {
      error = err;
      return;
    }
    if (chunk && chunk.length > 0) {
      pendingChunks.push(chunk);
    }
  });

  // Helper to flush pending chunks to disk
  const flushPending = async () => {
    if (pendingChunks.length === 0) return;

    // Write each chunk directly to avoid double memory allocation
    for (const chunk of pendingChunks) {
      await writableStream.write(chunk as unknown as BufferSource);
    }
    pendingChunks = [];
  };

  // Process files
  for (let i = 0; i < files.length; i++) {
    if (error) throw error;

    const fileHandle = files[i]!;
    const screenshot = parseFilename(fileHandle.name);
    const file = await fileHandle.getFile();
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    const zipPath = `${screenshot.gamename}/${fileHandle.name}`;
    const fileDate = screenshotToDate(screenshot);

    // Create file entry with date (no compression)
    const zipFile = new ZipPassThrough(zipPath);
    zipFile.mtime = fileDate;

    zip.add(zipFile);
    zipFile.push(data, true); // true = final chunk for this file

    // Flush after each file to keep memory low
    await flushPending();

    onProgress?.({ current: i + 1, total, phase: "processing" });
  }

  if (error) throw error;

  // Finalize ZIP
  onProgress?.({ current: total, total, phase: "finalizing" });
  zip.end();

  // Flush any remaining data (ZIP footer)
  await flushPending();

  await writableStream.close();

  return saveHandle.name;
}
