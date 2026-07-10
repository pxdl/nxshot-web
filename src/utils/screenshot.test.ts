import { describe, it, expect } from "vitest";
import {
  parseScreenshotFilename,
  sanitizePathSegment,
  getZipPath,
} from "./screenshot";
import type { CaptureIds, Screenshot } from "../types";

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

describe("sanitizePathSegment", () => {
  it("leaves ordinary game names unchanged", () => {
    expect(sanitizePathSegment("TETRIS 99 (EUR USA)")).toBe(
      "TETRIS 99 (EUR USA)"
    );
  });

  it("replaces embedded newlines with a single space", () => {
    expect(sanitizePathSegment("Baldo\nThe guardian owls (USA)")).toBe(
      "Baldo The guardian owls (USA)"
    );
  });

  it("strips forward and back slashes so no nested folders are created", () => {
    expect(sanitizePathSegment("Ratchet / Clank")).toBe("Ratchet Clank");
    expect(sanitizePathSegment("a\\b")).toBe("a b");
  });

  it("neutralizes path traversal segments", () => {
    expect(sanitizePathSegment("../etc")).toBe(".. etc");
    expect(sanitizePathSegment("..")).toBe("Unknown");
    expect(sanitizePathSegment(".")).toBe("Unknown");
  });

  it("strips control characters", () => {
    expect(sanitizePathSegment("Game\x00\x07Name")).toBe("Game Name");
  });

  it("trims trailing dots and spaces (invalid on Windows)", () => {
    expect(sanitizePathSegment("Game Name...")).toBe("Game Name");
    expect(sanitizePathSegment("Game Name  ")).toBe("Game Name");
  });

  it("falls back to Unknown for empty/whitespace-only names", () => {
    expect(sanitizePathSegment("")).toBe("Unknown");
    expect(sanitizePathSegment("   \n\t ")).toBe("Unknown");
  });
});

describe("getZipPath", () => {
  const base: Screenshot = {
    year: 2019,
    month: 1, // February
    day: 22,
    hour: 13,
    minute: 27,
    second: 36,
    captureId: "691C9B2C6D1F1E032DDC01FD026159FD",
    gameName: "TETRIS 99 (EUR USA)",
  };
  const file = "2019022213273600-691C9B2C6D1F1E032DDC01FD026159FD.jpg";

  it("builds by-game paths", () => {
    expect(getZipPath(base, file, "by-game")).toBe(
      `TETRIS 99 (EUR USA)/${file}`
    );
  });

  it("builds by-date paths without the game name", () => {
    expect(getZipPath(base, file, "by-date")).toBe(`2019/February/${file}`);
  });

  it("builds by-game-date paths", () => {
    expect(getZipPath(base, file, "by-game-date")).toBe(
      `TETRIS 99 (EUR USA)/2019-02/${file}`
    );
  });

  it("builds flat-renamed paths", () => {
    expect(getZipPath(base, file, "flat-renamed")).toBe(
      "TETRIS 99 (EUR USA) - 2019-02-22 13.27.36.jpg"
    );
  });

  it("sanitizes malicious game names in every game-based structure", () => {
    const evil: Screenshot = { ...base, gameName: "../../evil\nname" };
    expect(getZipPath(evil, file, "by-game")).toBe(`.. .. evil name/${file}`);
    expect(getZipPath(evil, file, "by-game-date")).toBe(
      `.. .. evil name/2019-02/${file}`
    );
    expect(getZipPath(evil, file, "flat-renamed")).toBe(
      ".. .. evil name - 2019-02-22 13.27.36.jpg"
    );
  });
});
