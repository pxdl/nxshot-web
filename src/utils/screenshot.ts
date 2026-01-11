import type { Screenshot, CaptureIds } from "../types";
import { FILENAME, VALIDATION, DEFAULTS } from "../constants";

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
  const testDate = new Date(year, month, day, hour, minute, second);
  if (isNaN(testDate.getTime())) {
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
