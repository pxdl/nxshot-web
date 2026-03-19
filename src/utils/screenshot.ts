import type {
  Screenshot,
  CaptureIds,
  GameGroup,
  ParsedFile,
  FolderStructure,
} from "../types";
import { FILENAME, VALIDATION, DEFAULTS, MONTH_NAMES } from "../constants";

/**
 * Parse a Nintendo Switch screenshot/video filename into its components.
 *
 * Filename format (53 characters):
 * YYYYMMDDHHMMSS???CAPTUREID?????????.ext
 * │─────────────│  │─────────────────│
 * 0-14: timestamp  17-49: 32-char capture ID
 *
 * @param filename - The screenshot filename to parse
 * @param captureIds - Optional map of capture IDs to game names. If not provided, gameName will be "Unknown"
 */
export function parseScreenshotFilename(
  filename: string,
  captureIds?: CaptureIds
): Screenshot {
  const year = +filename.substring(FILENAME.YEAR_START, FILENAME.YEAR_END);
  const month =
    +filename.substring(FILENAME.MONTH_START, FILENAME.MONTH_END) - 1; // 0-indexed for JS Date compatibility
  const day = +filename.substring(FILENAME.DAY_START, FILENAME.DAY_END);
  const hour = +filename.substring(FILENAME.HOUR_START, FILENAME.HOUR_END);
  const minute = +filename.substring(FILENAME.MINUTE_START, FILENAME.MINUTE_END);
  const second = +filename.substring(FILENAME.SECOND_START, FILENAME.SECOND_END);
  const captureId = filename.substring(
    FILENAME.CAPTURE_ID_START,
    FILENAME.CAPTURE_ID_END
  );

  // Validate parsed date components
  if (
    !Number.isFinite(year) ||
    year < VALIDATION.MIN_YEAR ||
    year > VALIDATION.MAX_YEAR ||
    !Number.isFinite(month) ||
    month < VALIDATION.MIN_MONTH ||
    month > VALIDATION.MAX_MONTH ||
    !Number.isFinite(day) ||
    day < VALIDATION.MIN_DAY ||
    day > VALIDATION.MAX_DAY ||
    !Number.isFinite(hour) ||
    hour < VALIDATION.MIN_HOUR ||
    hour > VALIDATION.MAX_HOUR ||
    !Number.isFinite(minute) ||
    minute < VALIDATION.MIN_MINUTE ||
    minute > VALIDATION.MAX_MINUTE ||
    !Number.isFinite(second) ||
    second < VALIDATION.MIN_SECOND ||
    second > VALIDATION.MAX_SECOND
  ) {
    throw new Error(`Invalid screenshot filename format: ${filename}`);
  }

  // Validate the date is actually valid (e.g., not Feb 31)
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const maxDay = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]!;
  if (day > maxDay) {
    throw new Error(`Invalid date in screenshot filename: ${filename}`);
  }

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    captureId,
    gameName: captureIds?.[captureId] ?? DEFAULTS.UNKNOWN_GAME_NAME,
  };
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Generate the ZIP path for a file based on the selected folder structure.
 */
export function getZipPath(
  screenshot: Screenshot,
  originalFilename: string,
  structure: FolderStructure
): string {
  switch (structure) {
    case "by-game":
      return `${screenshot.gameName}/${originalFilename}`;
    case "by-date":
      return `${screenshot.year}/${MONTH_NAMES[screenshot.month]}/${originalFilename}`;
    case "by-game-date":
      return `${screenshot.gameName}/${screenshot.year}-${pad2(screenshot.month + 1)}/${originalFilename}`;
    case "flat-renamed": {
      const ext = originalFilename.substring(originalFilename.lastIndexOf("."));
      return `${screenshot.gameName} - ${screenshot.year}-${pad2(screenshot.month + 1)}-${pad2(screenshot.day)} ${pad2(screenshot.hour)}.${pad2(screenshot.minute)}.${pad2(screenshot.second)}${ext}`;
    }
  }
}

/**
 * Group files by game name using parsed screenshot metadata.
 * Returns groups sorted alphabetically by game name.
 */
export function groupFilesByGame(
  files: File[],
  captureIds: CaptureIds
): GameGroup[] {
  const groups = new Map<string, ParsedFile[]>();

  for (const file of files) {
    try {
      const screenshot = parseScreenshotFilename(file.name, captureIds);
      const existing = groups.get(screenshot.gameName);
      if (existing) {
        existing.push({ file, screenshot });
      } else {
        groups.set(screenshot.gameName, [{ file, screenshot }]);
      }
    } catch {
      // Skip files that can't be parsed
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([gameName, parsedFiles]) => {
      let latest = 0;
      for (const f of parsedFiles) {
        const s = f.screenshot;
        const ts = s.year * 10_000_000_000 + s.month * 100_000_000 + s.day * 1_000_000
                 + s.hour * 10_000 + s.minute * 100 + s.second;
        if (ts > latest) latest = ts;
      }
      return { gameName, files: parsedFiles, latestTimestamp: latest };
    });
}
