import { describe, it, expect } from "vitest";
import { parseScreenshotFilename } from "./screenshot";
import type { CaptureIds } from "../types";

// Real Nintendo Switch screenshot filename examples:
// 2019022213273600-691C9B2C6D1F1E032DDC01FD026159FD.jpg
// 2019022214575600-691C9B2C6D1F1E032DDC01FD026159FD.mp4

// Mock capture IDs for testing
// Note: 691C9B2C6D1F1E032DDC01FD026159FD is the capture ID for TETRIS 99
const mockCaptureIds: CaptureIds = {
  "691C9B2C6D1F1E032DDC01FD026159FD": "TETRIS 99 (EUR USA)",
};

describe("parseScreenshotFilename", () => {
  it("should parse a valid screenshot filename", () => {
    const filename = "2019022213273600-691C9B2C6D1F1E032DDC01FD026159FD.jpg";
    expect(filename.length).toBe(53);

    const result = parseScreenshotFilename(filename, mockCaptureIds);

    expect(result.year).toBe(2019);
    expect(result.month).toBe(1); // February (0-indexed)
    expect(result.day).toBe(22);
    expect(result.hour).toBe(13);
    expect(result.minute).toBe(27);
    expect(result.second).toBe(36);
    expect(result.captureId).toBe("691C9B2C6D1F1E032DDC01FD026159FD");
    expect(result.gameName).toBe("TETRIS 99 (EUR USA)");
  });

  it("should parse a video filename", () => {
    const filename = "2019022214575600-691C9B2C6D1F1E032DDC01FD026159FD.mp4";
    expect(filename.length).toBe(53);

    const result = parseScreenshotFilename(filename, mockCaptureIds);

    expect(result.year).toBe(2019);
    expect(result.month).toBe(1);
    expect(result.day).toBe(22);
    expect(result.hour).toBe(14);
    expect(result.minute).toBe(57);
    expect(result.second).toBe(56);
  });

  it("should return 'Unknown' for unrecognized capture IDs", () => {
    const filename = "2019021922503100-FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF.jpg";
    expect(filename.length).toBe(53);

    const result = parseScreenshotFilename(filename, mockCaptureIds);
    expect(result.gameName).toBe("Unknown");
  });

  it("should return 'Unknown' when no captureIds provided", () => {
    const filename = "2019021922503100-691C9B2C6D1F1E032DDC01FD026159FD.jpg";
    expect(filename.length).toBe(53);

    const result = parseScreenshotFilename(filename);
    expect(result.gameName).toBe("Unknown");
  });

  it("should handle different dates correctly", () => {
    const filename = "2019021922503100-691C9B2C6D1F1E032DDC01FD026159FD.jpg";
    expect(filename.length).toBe(53);

    const result = parseScreenshotFilename(filename, mockCaptureIds);

    expect(result.year).toBe(2019);
    expect(result.month).toBe(1); // February
    expect(result.day).toBe(19);
    expect(result.hour).toBe(22);
    expect(result.minute).toBe(50);
    expect(result.second).toBe(31);
  });

  it("should handle December correctly (month 11)", () => {
    const filename = "2019121922503100-691C9B2C6D1F1E032DDC01FD026159FD.jpg";
    expect(filename.length).toBe(53);

    const result = parseScreenshotFilename(filename, mockCaptureIds);
    expect(result.month).toBe(11); // December (0-indexed)
  });

  it("should throw error for invalid year (before Switch launch)", () => {
    const filename = "2016022213273600-691C9B2C6D1F1E032DDC01FD026159FD.jpg";
    expect(filename.length).toBe(53);

    expect(() => parseScreenshotFilename(filename)).toThrow(
      "Invalid screenshot filename format"
    );
  });

  it("should throw error for invalid year (too far in future)", () => {
    const filename = "2101022213273600-691C9B2C6D1F1E032DDC01FD026159FD.jpg";
    expect(filename.length).toBe(53);

    expect(() => parseScreenshotFilename(filename)).toThrow(
      "Invalid screenshot filename format"
    );
  });

  it("should throw error for invalid month", () => {
    const filename = "2019132213273600-691C9B2C6D1F1E032DDC01FD026159FD.jpg";
    expect(filename.length).toBe(53);

    expect(() => parseScreenshotFilename(filename)).toThrow(
      "Invalid screenshot filename format"
    );
  });

  it("should throw error for invalid day", () => {
    const filename = "2019023213273600-691C9B2C6D1F1E032DDC01FD026159FD.jpg";
    expect(filename.length).toBe(53);

    expect(() => parseScreenshotFilename(filename)).toThrow(
      "Invalid screenshot filename format"
    );
  });

  it("should throw error for invalid hour", () => {
    const filename = "2019022225273600-691C9B2C6D1F1E032DDC01FD026159FD.jpg";
    expect(filename.length).toBe(53);

    expect(() => parseScreenshotFilename(filename)).toThrow(
      "Invalid screenshot filename format"
    );
  });

  it("should throw error for invalid minute", () => {
    const filename = "2019022213603600-691C9B2C6D1F1E032DDC01FD026159FD.jpg";
    expect(filename.length).toBe(53);

    expect(() => parseScreenshotFilename(filename)).toThrow(
      "Invalid screenshot filename format"
    );
  });

  it("should throw error for invalid second", () => {
    const filename = "2019022213276000-691C9B2C6D1F1E032DDC01FD026159FD.jpg";
    expect(filename.length).toBe(53);

    expect(() => parseScreenshotFilename(filename)).toThrow(
      "Invalid screenshot filename format"
    );
  });

  it("should throw error for non-numeric date values", () => {
    const filename = "XXXX022213273600-691C9B2C6D1F1E032DDC01FD026159FD.jpg";
    expect(filename.length).toBe(53);

    expect(() => parseScreenshotFilename(filename)).toThrow(
      "Invalid screenshot filename format"
    );
  });
});
