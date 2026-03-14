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

export interface FunFacts {
  busiestDay: { date: Date; count: number } | null;
  longestGap: { days: number; from: Date; to: Date } | null;
  singleCaptureGames: number;
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
  hourDistribution: number[];
  dayOfWeekDistribution: number[];
  funFacts: FunFacts;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

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
  const hourDist: number[] = new Array(24).fill(0);
  const dayMap = new Map<number, { date: Date; count: number }>();

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

      hourDist[f.screenshot.hour] = hourDist[f.screenshot.hour]! + 1;

      const dayEntry = dayMap.get(dateKey);
      if (dayEntry) {
        dayEntry.count++;
      } else {
        dayMap.set(dateKey, { date: new Date(year, month, day), count: 1 });
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

  // Day-of-week distribution and busiest day from dayMap
  const dowDist: number[] = new Array(7).fill(0);
  let busiestDay: { date: Date; count: number } | null = null;
  for (const entry of dayMap.values()) {
    const dow = entry.date.getDay();
    dowDist[dow] = dowDist[dow]! + entry.count;
    if (!busiestDay || entry.count > busiestDay.count) {
      busiestDay = entry;
    }
  }

  // Longest gap between capture days
  const sortedDays = Array.from(dayMap.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  let longestGap: FunFacts["longestGap"] = null;
  for (let i = 1; i < sortedDays.length; i++) {
    const days = Math.round(
      (sortedDays[i]!.date.getTime() - sortedDays[i - 1]!.date.getTime()) /
        MS_PER_DAY
    );
    if (!longestGap || days > longestGap.days) {
      longestGap = { days, from: sortedDays[i - 1]!.date, to: sortedDays[i]!.date };
    }
  }

  const singleCaptureGames = gameStats.filter((g) => g.totalFiles === 1).length;

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
    hourDistribution: hourDist,
    dayOfWeekDistribution: dowDist,
    funFacts: { busiestDay, longestGap, singleCaptureGames },
  };
}
