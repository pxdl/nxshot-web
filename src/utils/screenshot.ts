import type { Screenshot, GameIds } from "../types";
import gameids from "../data/gameids.json";

const gameidsMap: GameIds = gameids;

/**
 * Parse a Nintendo Switch screenshot/video filename into its components.
 *
 * Filename format (53 characters):
 * YYYYMMDDHHMMSS???GAMEID????????????.ext
 * │─────────────│  │──────────────────│
 * 0-14: timestamp  17-49: 32-char game ID
 */
export function parseScreenshotFilename(filename: string): Screenshot {
  return {
    year: +filename.substring(0, 4),
    month: +filename.substring(4, 6) - 1, // 0-indexed for JS Date compatibility
    day: +filename.substring(6, 8),
    hour: +filename.substring(8, 10),
    minute: +filename.substring(10, 12),
    second: +filename.substring(12, 14),
    gameid: filename.substring(17, 49),
    gamename: gameidsMap[filename.substring(17, 49)] ?? "Unknown",
  };
}
