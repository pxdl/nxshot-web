import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadCaptureIds,
  getCachedCaptureIds,
  isCaptureIdsLoaded,
  clearCaptureIdsCache,
} from "./captureIds";

describe("captureIds", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearCaptureIdsCache();
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("should return null from cache when not loaded", () => {
    expect(getCachedCaptureIds()).toBeNull();
    expect(isCaptureIdsLoaded()).toBe(false);
  });

  it("should load and cache capture IDs", async () => {
    const mockCaptureIds = { ABC123: "Test Game" };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCaptureIds),
    });

    const result = await loadCaptureIds();

    expect(result).toEqual(mockCaptureIds);
    expect(getCachedCaptureIds()).toEqual(mockCaptureIds);
    expect(isCaptureIdsLoaded()).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("should return cached data without fetching again", async () => {
    const mockCaptureIds = { ABC123: "Test Game" };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCaptureIds),
    });

    await loadCaptureIds();
    await loadCaptureIds();
    await loadCaptureIds();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("should share the same promise for concurrent calls", async () => {
    const mockCaptureIds = { ABC123: "Test Game" };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCaptureIds),
    });

    const [result1, result2, result3] = await Promise.all([
      loadCaptureIds(),
      loadCaptureIds(),
      loadCaptureIds(),
    ]);

    expect(result1).toEqual(mockCaptureIds);
    expect(result2).toEqual(mockCaptureIds);
    expect(result3).toEqual(mockCaptureIds);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("should throw error on failed fetch", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(loadCaptureIds()).rejects.toThrow(
      "Failed to load capture IDs: 404"
    );
  });

  it("should clear cache correctly", async () => {
    const mockCaptureIds = { ABC123: "Test Game" };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCaptureIds),
    });

    await loadCaptureIds();
    expect(isCaptureIdsLoaded()).toBe(true);

    clearCaptureIdsCache();
    expect(isCaptureIdsLoaded()).toBe(false);
    expect(getCachedCaptureIds()).toBeNull();
  });
});
