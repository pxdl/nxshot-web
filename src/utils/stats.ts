import type { GameGroup } from "../types";
import { IMAGE_EXT, VIDEO_EXT } from "../constants";

export interface GameStat {
  gameName: string;
  totalFiles: number;
  imageCount: number;
  videoCount: number;
  totalSize: number;
}

export interface MonthBucket {
  year: number;
  month: number;
  label: string;
  count: number;
}

export interface CollectionStats {
  totalFiles: number;
  totalImages: number;
  totalVideos: number;
  totalSize: number;
  totalGames: number;
  firstCapture: Date | null;
  lastCapture: Date | null;
  gameStats: GameStat[];
  timeline: MonthBucket[];
  busiestMonth: MonthBucket | null;
  topGame: GameStat | null;
  averageCapturesPerGame: number;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function computeStats(gameGroups: GameGroup[]): CollectionStats {
  let totalImages = 0;
  let totalVideos = 0;
  let totalSize = 0;
  let totalFiles = 0;
  let minDateKey = Infinity;
  let maxDateKey = -Infinity;
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  const gameStats: GameStat[] = [];
  const monthMap = new Map<string, MonthBucket>();

  for (const group of gameGroups) {
    let images = 0;
    let videos = 0;
    let size = 0;

    for (const f of group.files) {
      const name = f.file.name;
      if (name.endsWith(IMAGE_EXT)) images++;
      else if (name.endsWith(VIDEO_EXT)) videos++;

      size += f.file.size;

      const { year, month, day } = f.screenshot;
      const dateKey = year * 10000 + month * 100 + day;
      if (dateKey < minDateKey) {
        minDateKey = dateKey;
        minDate = new Date(year, month, day);
      }
      if (dateKey > maxDateKey) {
        maxDateKey = dateKey;
        maxDate = new Date(year, month, day);
      }

      const key = `${year}-${month}`;
      const existing = monthMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        monthMap.set(key, {
          year,
          month,
          label: `${MONTH_NAMES[month]} ${year}`,
          count: 1,
        });
      }
    }

    totalImages += images;
    totalVideos += videos;
    totalSize += size;
    totalFiles += group.files.length;

    gameStats.push({
      gameName: group.gameName,
      totalFiles: group.files.length,
      imageCount: images,
      videoCount: videos,
      totalSize: size,
    });
  }

  // Sort games by file count descending
  gameStats.sort((a, b) => b.totalFiles - a.totalFiles);

  // Build sorted timeline
  const timeline = Array.from(monthMap.values()).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  );

  const busiestMonth =
    timeline.length > 0
      ? timeline.reduce((max, m) => (m.count > max.count ? m : max))
      : null;

  return {
    totalFiles,
    totalImages,
    totalVideos,
    totalSize,
    totalGames: gameGroups.length,
    firstCapture: minDate,
    lastCapture: maxDate,
    gameStats,
    timeline,
    busiestMonth,
    topGame: gameStats[0] ?? null,
    averageCapturesPerGame:
      gameGroups.length > 0 ? Math.round(totalFiles / gameGroups.length) : 0,
  };
}
