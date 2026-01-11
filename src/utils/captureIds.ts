import type { CaptureIds, CaptureIdsMetadata } from "../types";

const CAPTURE_IDS_URL = "/data/captureIds.json";
const METADATA_URL = "/data/captureIds.meta.json";

let cache: CaptureIds | null = null;
let loadingPromise: Promise<CaptureIds> | null = null;

let metadataCache: CaptureIdsMetadata | null = null;
let metadataLoadingPromise: Promise<CaptureIdsMetadata> | null = null;

/**
 * Load capture IDs from the server with in-memory caching.
 * Multiple concurrent calls will share the same request.
 */
export async function loadCaptureIds(): Promise<CaptureIds> {
  // Return cached data if available
  if (cache) {
    return cache;
  }

  // If already loading, return the existing promise
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading
  loadingPromise = fetch(CAPTURE_IDS_URL)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load capture IDs: ${response.status}`);
      }
      const data: CaptureIds = await response.json();
      cache = data;
      return data;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

/**
 * Get cached capture IDs synchronously.
 * Returns null if not yet loaded - use loadCaptureIds() first.
 */
export function getCachedCaptureIds(): CaptureIds | null {
  return cache;
}

/**
 * Check if capture IDs are loaded.
 */
export function isCaptureIdsLoaded(): boolean {
  return cache !== null;
}

/**
 * Clear the cache (useful for testing or forcing a reload).
 */
export function clearCaptureIdsCache(): void {
  cache = null;
  loadingPromise = null;
  metadataCache = null;
  metadataLoadingPromise = null;
}

/**
 * Load capture IDs metadata from the server with in-memory caching.
 */
export async function loadCaptureIdsMetadata(): Promise<CaptureIdsMetadata> {
  if (metadataCache) {
    return metadataCache;
  }

  if (metadataLoadingPromise) {
    return metadataLoadingPromise;
  }

  metadataLoadingPromise = fetch(METADATA_URL)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load metadata: ${response.status}`);
      }
      const data: CaptureIdsMetadata = await response.json();
      metadataCache = data;
      return data;
    })
    .finally(() => {
      metadataLoadingPromise = null;
    });

  return metadataLoadingPromise;
}
