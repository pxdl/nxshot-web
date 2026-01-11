// Nintendo Switch screenshot filename format:
// YYYYMMDDHHMMSS???CAPTUREID?????????.ext
// Total length: 53 characters

// Filename parsing positions
export const FILENAME = {
  TOTAL_LENGTH: 53,
  YEAR_START: 0,
  YEAR_END: 4,
  MONTH_START: 4,
  MONTH_END: 6,
  DAY_START: 6,
  DAY_END: 8,
  HOUR_START: 8,
  HOUR_END: 10,
  MINUTE_START: 10,
  MINUTE_END: 12,
  SECOND_START: 12,
  SECOND_END: 14,
  CAPTURE_ID_START: 17,
  CAPTURE_ID_END: 49,
} as const;

// Valid file extensions for Nintendo Switch captures
export const VALID_EXTENSIONS = [".jpg", ".mp4"] as const;

// Validation bounds
export const VALIDATION = {
  MIN_YEAR: 2017, // Nintendo Switch launch year
  MAX_YEAR: 2100,
  MIN_MONTH: 0,
  MAX_MONTH: 11,
  MIN_DAY: 1,
  MAX_DAY: 31,
  MIN_HOUR: 0,
  MAX_HOUR: 23,
  MIN_MINUTE: 0,
  MAX_MINUTE: 59,
  MIN_SECOND: 0,
  MAX_SECOND: 59,
} as const;

// Default values
export const DEFAULTS = {
  UNKNOWN_GAME_NAME: "Unknown",
  ZIP_FILENAME: "Nintendo Switch Captures.zip",
  EXCLUDED_DIRECTORY: "Organized",
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  THEME: "theme",
} as const;

// Theme values
export const THEME = {
  DARK: "dark",
  LIGHT: "light",
} as const;
