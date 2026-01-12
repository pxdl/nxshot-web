import { Zip, ZipPassThrough } from "fflate";
import streamSaver from "streamsaver";
import type { Screenshot } from "../types";
import { DEFAULTS } from "../constants";

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
 * Check if native File System Access API is available.
 */
function hasNativeFileSystemAccess(): boolean {
  return "showSaveFilePicker" in window;
}

/**
 * Create a writable stream using native File System Access API.
 * Returns the stream and the filename chosen by the user.
 */
async function createNativeWritableStream(): Promise<{
  stream: WritableStream<Uint8Array>;
  filename: string;
  close: () => Promise<void>;
  abort: () => Promise<void>;
}> {
  const saveHandle = await window.showSaveFilePicker({
    suggestedName: DEFAULTS.ZIP_FILENAME,
    types: [
      {
        description: "ZIP Archive",
        accept: { "application/zip": [".zip"] },
      },
    ],
  });

  const writableStream = await saveHandle.createWritable();

  return {
    stream: writableStream as unknown as WritableStream<Uint8Array>,
    filename: saveHandle.name ?? DEFAULTS.ZIP_FILENAME,
    close: async () => {
      await writableStream.close();
    },
    abort: async () => {
      await writableStream.abort();
    },
  };
}

/**
 * Create a writable stream using StreamSaver.js for cross-browser support.
 */
function createStreamSaverWritableStream(): {
  stream: WritableStream<Uint8Array>;
  filename: string;
  close: () => Promise<void>;
  abort: () => Promise<void>;
} {
  const filename = DEFAULTS.ZIP_FILENAME;
  const fileStream = streamSaver.createWriteStream(filename);

  return {
    stream: fileStream,
    filename,
    close: async () => {
      const writer = fileStream.getWriter();
      await writer.close();
    },
    abort: async () => {
      const writer = fileStream.getWriter();
      await writer.abort();
    },
  };
}

/**
 * Create and save a ZIP file with proper dates using fflate.
 * Uses native File System Access API when available, falls back to StreamSaver.js.
 * Streams directly to disk to handle large files (2GB+).
 * Returns the saved filename.
 */
export async function createZip(
  files: File[],
  parseFilename: (filename: string) => Screenshot,
  onProgress?: ProgressCallback
): Promise<string> {
  // Choose the appropriate streaming method
  const useNative = hasNativeFileSystemAccess();

  let writable: {
    stream: WritableStream<Uint8Array>;
    filename: string;
    close: () => Promise<void>;
    abort: () => Promise<void>;
  };

  if (useNative) {
    // Use native File System Access API (Chromium)
    // This provides a save file picker for better UX
    writable = await createNativeWritableStream();
  } else {
    // Use StreamSaver.js for Firefox/Safari
    // Downloads directly to the Downloads folder
    writable = createStreamSaverWritableStream();
  }

  const writer = writable.stream.getWriter();
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

    for (const chunk of pendingChunks) {
      await writer.write(chunk);
    }
    pendingChunks = [];
  };

  try {
    // Process files
    for (let i = 0; i < files.length; i++) {
      if (error) throw error;

      const file = files[i];
      if (!file) continue;

      const screenshot = parseFilename(file.name);
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      const zipPath = `${screenshot.gameName}/${file.name}`;
      const fileDate = screenshotToDate(screenshot);

      // Create file entry with date (no compression for images/videos)
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

    // Close the writer and stream
    writer.releaseLock();
    await writable.close();
  } catch (e) {
    // Ensure stream is closed on error to prevent resource leak
    try {
      writer.releaseLock();
      await writable.abort();
    } catch {
      // Ignore abort errors
    }
    throw e;
  }

  return writable.filename;
}
