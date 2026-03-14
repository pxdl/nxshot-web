import { useMemo } from "react";
import {
  CameraIcon,
  FilmIcon,
  PhotoIcon,
  CalendarIcon,
  CircleStackIcon,
  TrophyIcon,
  FireIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import type { GameGroup } from "../types";
import { formatDate, formatSize } from "../utils/format";
import { computeStats } from "../utils/stats";

interface CollectionStatsProps {
  gameGroups: GameGroup[];
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-stone-50 dark:bg-slate-800/50 border border-stone-200/50 dark:border-slate-700/30">
      <div className="p-2 rounded-lg bg-white dark:bg-slate-700/50 text-nx shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-stone-400 dark:text-slate-500 font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="text-xl font-bold text-stone-800 dark:text-slate-100 font-display tracking-tight">
          {value}
        </p>
        {sub && (
          <p className="text-xs text-stone-400 dark:text-slate-500 mt-0.5">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-nx">{icon}</span>
      <h3 className="text-sm font-semibold text-stone-700 dark:text-slate-300 uppercase tracking-wider">
        {title}
      </h3>
    </div>
  );
}

function GameBar({
  gameName,
  count,
  maxCount,
  size,
  rank,
}: {
  gameName: string;
  count: number;
  maxCount: number;
  size: number;
  rank: number;
}) {
  const pct = (count / maxCount) * 100;
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-stone-300 dark:text-slate-600 w-5 text-right shrink-0">
            {rank}
          </span>
          <span className="text-sm text-stone-700 dark:text-slate-300 truncate font-medium">
            {gameName}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-stone-400 dark:text-slate-500 font-mono">
            {formatSize(size)}
          </span>
          <span className="text-sm font-semibold text-stone-600 dark:text-slate-400 font-mono w-10 text-right">
            {count}
          </span>
        </div>
      </div>
      <div className="h-2 bg-stone-100 dark:bg-slate-800 rounded-full overflow-hidden ml-7">
        <div
          className="h-full rounded-full bg-gradient-to-r from-nx to-red-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TimelineBar({
  label,
  count,
  maxCount,
  isMax,
}: {
  label: string;
  count: number;
  maxCount: number;
  isMax: boolean;
}) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span className="text-xs font-mono text-stone-500 dark:text-slate-400 font-semibold">
        {count}
      </span>
      <div className="w-full h-24 bg-stone-100 dark:bg-slate-800 rounded-t-md relative flex items-end overflow-hidden">
        <div
          className={`w-full rounded-t-md transition-all duration-500 ${
            isMax
              ? "bg-gradient-to-t from-nx to-red-400"
              : "bg-stone-300 dark:bg-slate-600"
          }`}
          style={{ height: `${Math.max(pct, 4)}%` }}
        />
      </div>
      <span
        className="text-[10px] text-stone-400 dark:text-slate-500 truncate w-full text-center"
        title={label}
      >
        {label}
      </span>
    </div>
  );
}

function MediaSplit({
  images,
  videos,
}: {
  images: number;
  videos: number;
}) {
  const total = images + videos;
  if (total === 0) return null;
  const imgPct = (images / total) * 100;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-3 flex-1 rounded-full overflow-hidden flex bg-stone-100 dark:bg-slate-800">
          <div
            className="bg-gradient-to-r from-nx to-red-400 transition-all duration-500"
            style={{ width: `${imgPct}%` }}
          />
          <div
            className="bg-gradient-to-r from-stone-400 to-stone-300 dark:from-slate-500 dark:to-slate-600 transition-all duration-500"
            style={{ width: `${100 - imgPct}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-nx" />
          <PhotoIcon className="w-4 h-4 text-stone-400 dark:text-slate-500" />
          <span className="text-stone-600 dark:text-slate-400">
            {images.toLocaleString()} screenshot{images !== 1 ? "s" : ""}
          </span>
          <span className="text-stone-400 dark:text-slate-500 font-mono text-xs">
            ({Math.round(imgPct)}%)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-stone-400 dark:bg-slate-500" />
          <FilmIcon className="w-4 h-4 text-stone-400 dark:text-slate-500" />
          <span className="text-stone-600 dark:text-slate-400">
            {videos.toLocaleString()} video{videos !== 1 ? "s" : ""}
          </span>
          <span className="text-stone-400 dark:text-slate-500 font-mono text-xs">
            ({Math.round(100 - imgPct)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

const MAX_GAMES_SHOWN = 15;
const MAX_TIMELINE_MONTHS = 24;

export function CollectionStats({ gameGroups }: CollectionStatsProps) {
  const stats = useMemo(() => computeStats(gameGroups), [gameGroups]);

  const topGames = stats.gameStats.slice(0, MAX_GAMES_SHOWN);
  const remainingGames = stats.gameStats.length - MAX_GAMES_SHOWN;
  const maxGameCount = topGames[0]?.totalFiles ?? 0;

  // For timeline, show up to 24 months; if more, show last 24
  const timelineSlice =
    stats.timeline.length > MAX_TIMELINE_MONTHS
      ? stats.timeline.slice(-MAX_TIMELINE_MONTHS)
      : stats.timeline;
  const maxMonthCount = Math.max(...timelineSlice.map((m) => m.count), 0);

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="text-center py-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-nx/10 dark:bg-nx/20 text-nx text-sm font-semibold mb-3">
          <SparklesIcon className="w-4 h-4" />
          Your Switch in Review
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<CameraIcon className="w-5 h-5" />}
          label="Total Captures"
          value={stats.totalFiles.toLocaleString()}
          sub={`${stats.averageCapturesPerGame} avg per game`}
        />
        <StatCard
          icon={<CircleStackIcon className="w-5 h-5" />}
          label="Total Size"
          value={formatSize(stats.totalSize)}
        />
        <StatCard
          icon={<CalendarIcon className="w-5 h-5" />}
          label="Date Range"
          value={
            stats.firstCapture && stats.lastCapture
              ? formatDate(stats.firstCapture)
              : "—"
          }
          sub={
            stats.lastCapture
              ? `to ${formatDate(stats.lastCapture)}`
              : undefined
          }
        />
        <StatCard
          icon={<TrophyIcon className="w-5 h-5" />}
          label="Most Captured"
          value={stats.topGame?.gameName ?? "—"}
          sub={
            stats.topGame
              ? `${stats.topGame.totalFiles} captures`
              : undefined
          }
        />
      </div>

      {/* Media split */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#161b22] border border-stone-200/80 dark:border-slate-700/50">
        <SectionHeader
          icon={<PhotoIcon className="w-4 h-4" />}
          title="Screenshots vs Videos"
        />
        <MediaSplit images={stats.totalImages} videos={stats.totalVideos} />
      </div>

      {/* Top games */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#161b22] border border-stone-200/80 dark:border-slate-700/50">
        <SectionHeader
          icon={<TrophyIcon className="w-4 h-4" />}
          title={`Top Games (${stats.totalGames} total)`}
        />
        <div className="space-y-3">
          {topGames.map((game, i) => (
            <GameBar
              key={game.gameName}
              gameName={game.gameName}
              count={game.totalFiles}
              maxCount={maxGameCount}
              size={game.totalSize}
              rank={i + 1}
            />
          ))}
          {remainingGames > 0 && (
            <p className="text-xs text-stone-400 dark:text-slate-500 text-center pt-1">
              and {remainingGames} more game{remainingGames !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Timeline */}
      {timelineSlice.length > 1 && (
        <div className="p-4 rounded-xl bg-white dark:bg-[#161b22] border border-stone-200/80 dark:border-slate-700/50">
          <SectionHeader
            icon={<FireIcon className="w-4 h-4" />}
            title="Capture Timeline"
          />
          {stats.busiestMonth && (
            <p className="text-xs text-stone-400 dark:text-slate-500 mb-3">
              Peak:{" "}
              <span className="font-semibold text-stone-600 dark:text-slate-300">
                {stats.busiestMonth.label}
              </span>{" "}
              with {stats.busiestMonth.count} captures
            </p>
          )}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {timelineSlice.map((m) => (
              <TimelineBar
                key={`${m.year}-${m.month}`}
                label={m.label}
                count={m.count}
                maxCount={maxMonthCount}
                isMax={
                  stats.busiestMonth !== null &&
                  m.year === stats.busiestMonth.year &&
                  m.month === stats.busiestMonth.month
                }
              />
            ))}
          </div>
          {stats.timeline.length > MAX_TIMELINE_MONTHS && (
            <p className="text-xs text-stone-400 dark:text-slate-500 text-center mt-2">
              Showing last {MAX_TIMELINE_MONTHS} months of{" "}
              {stats.timeline.length}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
