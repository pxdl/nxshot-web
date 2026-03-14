import { useMemo } from "react";
import {
  CameraIcon,
  FilmIcon,
  PhotoIcon,
  CalendarIcon,
  CircleStackIcon,
  TrophyIcon,
  FireIcon,
  ClockIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import type { GameGroup } from "../types";
import { formatDate, formatSize } from "../utils/format";
import { computeStats, type GameStat } from "../utils/stats";

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
    <div className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-slate-800/60 border border-stone-200/80 dark:border-slate-700/40 shadow-sm dark:shadow-black/10">
      <div className="p-2 rounded-lg bg-stone-50 dark:bg-slate-700/60 text-nx shrink-0">
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

function SectionCard({
  icon,
  title,
  children,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <div
      className="p-5 rounded-xl bg-white dark:bg-[#161b22] border border-stone-200/80 dark:border-slate-700/50 shadow-sm dark:shadow-black/10 animate-fade-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-nx">{icon}</span>
        <h3 className="text-sm font-semibold text-stone-700 dark:text-slate-300 uppercase tracking-wider">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

const RANK_STYLES: Record<number, string> = {
  1: "text-amber-500 dark:text-amber-400 font-bold",
  2: "text-stone-400 dark:text-slate-400 font-bold",
  3: "text-amber-700 dark:text-amber-600 font-bold",
};

function GameBar({
  game,
  maxCount,
  rank,
}: {
  game: GameStat;
  maxCount: number;
  rank: number;
}) {
  const { gameName, totalFiles, totalSize, imageCount, videoCount } = game;
  const pct = (totalFiles / maxCount) * 100;
  const isTop3 = rank <= 3;
  const imgPct = totalFiles > 0 ? (imageCount / totalFiles) * pct : 0;
  const vidPct = pct - imgPct;
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-xs font-mono w-5 text-right shrink-0 ${
              RANK_STYLES[rank] ?? "text-stone-300 dark:text-slate-600"
            }`}
          >
            {rank}
          </span>
          <span
            className={`text-sm truncate ${
              isTop3
                ? "text-stone-800 dark:text-slate-200 font-semibold"
                : "text-stone-600 dark:text-slate-400 font-medium"
            }`}
          >
            {gameName}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-stone-400 dark:text-slate-500 font-mono hidden sm:inline">
            {formatSize(totalSize)}
          </span>
          <span className="text-sm font-semibold text-stone-600 dark:text-slate-400 font-mono w-10 text-right">
            {totalFiles}
          </span>
        </div>
      </div>
      <div className="h-2 bg-stone-100 dark:bg-slate-800 rounded-full overflow-hidden ml-7 flex">
        <div
          className={`h-full transition-all duration-500 ${
            imgPct > 0 ? "rounded-l-full" : ""
          } ${
            vidPct === 0 ? "rounded-r-full" : ""
          } ${
            isTop3
              ? "bg-gradient-to-r from-nx to-red-400"
              : "bg-gradient-to-r from-stone-300 to-stone-200 dark:from-slate-600 dark:to-slate-700"
          }`}
          style={{ width: `${imgPct}%` }}
        />
        {videoCount > 0 && (
          <div
            className={`h-full transition-all duration-500 ${
              imgPct === 0 ? "rounded-l-full" : ""
            } rounded-r-full ${
              isTop3
                ? "bg-gradient-to-r from-blue-400 to-blue-300 dark:from-blue-500 dark:to-blue-600"
                : "bg-gradient-to-r from-blue-300 to-blue-200 dark:from-blue-700 dark:to-blue-800"
            }`}
            style={{ width: `${vidPct}%` }}
          />
        )}
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
    <div
      className="flex flex-col items-center gap-1 min-w-[2rem]"
      title={`${label}: ${count} captures`}
    >
      <span
        className={`text-[10px] font-mono tabular-nums ${
          isMax
            ? "text-nx font-bold"
            : "text-stone-400 dark:text-slate-500"
        }`}
      >
        {count}
      </span>
      <div className="w-full h-20 bg-stone-100 dark:bg-slate-800/80 rounded-md relative flex items-end overflow-hidden">
        <div
          className={`w-full rounded-md transition-all duration-500 ${
            isMax
              ? "bg-gradient-to-t from-nx to-red-400"
              : "bg-nx/20 dark:bg-nx/15"
          }`}
          style={{ height: `${Math.max(pct, 4)}%` }}
        />
      </div>
      <span
        className={`text-[10px] truncate w-full text-center ${
          isMax
            ? "text-nx font-semibold"
            : "text-stone-400 dark:text-slate-500"
        }`}
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
      <div className="h-4 flex rounded-full overflow-hidden bg-stone-100 dark:bg-slate-800 mb-3">
        <div
          className="bg-gradient-to-r from-nx to-red-400 transition-all duration-500"
          style={{ width: `${imgPct}%` }}
        />
        <div
          className="bg-gradient-to-r from-blue-400 to-blue-300 dark:from-blue-500 dark:to-blue-600 transition-all duration-500"
          style={{ width: `${100 - imgPct}%` }}
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-nx shrink-0" />
          <PhotoIcon className="w-4 h-4 text-stone-400 dark:text-slate-500" />
          <span className="text-stone-600 dark:text-slate-400">
            {images.toLocaleString()} screenshot{images !== 1 ? "s" : ""}
          </span>
          <span className="text-stone-400 dark:text-slate-500 font-mono text-xs">
            ({Math.round(imgPct)}%)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-400 dark:bg-blue-500 shrink-0" />
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

function FunFactCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200/50 dark:border-slate-700/30">
      <p className="text-xs text-stone-400 dark:text-slate-500 font-medium uppercase tracking-wider mb-1">
        {title}
      </p>
      <p className="text-sm font-semibold text-stone-800 dark:text-slate-200">
        {value}
      </p>
      <p className="text-xs text-stone-400 dark:text-slate-500 mt-0.5">
        {sub}
      </p>
    </div>
  );
}

const TIME_PERIODS = [
  { label: "Morning", range: "6am \u2013 12pm", start: 6, end: 12 },
  { label: "Afternoon", range: "12pm \u2013 6pm", start: 12, end: 18 },
  { label: "Evening", range: "6pm \u2013 12am", start: 18, end: 24 },
  { label: "Night", range: "12am \u2013 6am", start: 0, end: 6 },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sun from getDay() indices

const MAX_GAMES_SHOWN = 15;
const MAX_TIMELINE_MONTHS = 24;

export function CollectionStats({ gameGroups }: CollectionStatsProps) {
  const stats = useMemo(() => computeStats(gameGroups), [gameGroups]);

  const topGames = stats.gameStats.slice(0, MAX_GAMES_SHOWN);
  const remainingGames = stats.gameStats.length - MAX_GAMES_SHOWN;
  const maxGameCount = topGames[0]?.totalFiles ?? 0;

  const timelineSlice =
    stats.timeline.length > MAX_TIMELINE_MONTHS
      ? stats.timeline.slice(-MAX_TIMELINE_MONTHS)
      : stats.timeline;
  const maxMonthCount = Math.max(...timelineSlice.map((m) => m.count), 0);

  const timePeriodCounts = TIME_PERIODS.map((p) => {
    let count = 0;
    for (let h = p.start; h < p.end; h++) count += stats.hourDistribution[h]!;
    return count;
  });
  const maxTimePeriod = Math.max(...timePeriodCounts);

  const dowCounts = DAY_ORDER.map((i) => stats.dayOfWeekDistribution[i]!);
  const maxDow = Math.max(...dowCounts);

  const { funFacts } = stats;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up"
        style={{ animationDelay: "0.05s" }}
      >
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
              : "\u2014"
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
          value={stats.topGame?.gameName ?? "\u2014"}
          sub={
            stats.topGame
              ? `${stats.topGame.totalFiles} captures`
              : undefined
          }
        />
      </div>

      {/* Media split */}
      <SectionCard
        icon={<PhotoIcon className="w-4 h-4" />}
        title="Screenshots vs Videos"
        delay={0.1}
      >
        <MediaSplit images={stats.totalImages} videos={stats.totalVideos} />
      </SectionCard>

      {/* Top games */}
      <SectionCard
        icon={<TrophyIcon className="w-4 h-4" />}
        title={`Top Games (${stats.totalGames} total)`}
        delay={0.15}
      >
        <div className="space-y-3">
          {topGames.map((game, i) => (
            <GameBar
              key={game.gameName}
              game={game}
              maxCount={maxGameCount}
              rank={i + 1}
            />
          ))}
          {remainingGames > 0 && (
            <p className="text-xs text-stone-400 dark:text-slate-500 text-center pt-2">
              and {remainingGames} more game{remainingGames !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </SectionCard>

      {/* Timeline */}
      {timelineSlice.length > 1 && (
        <SectionCard
          icon={<FireIcon className="w-4 h-4" />}
          title="Capture Timeline"
          delay={0.2}
        >
          {stats.busiestMonth && (
            <p className="text-xs text-stone-400 dark:text-slate-500 mb-3 -mt-1">
              Peak:{" "}
              <span className="font-semibold text-nx">
                {stats.busiestMonth.label}
              </span>{" "}
              with {stats.busiestMonth.count} captures
            </p>
          )}
          <div className="flex gap-px overflow-x-auto pb-1 -mx-1 px-1">
            {timelineSlice.map((m) => (
              <TimelineBar
                key={`${m.year}-${m.month}`}
                label={m.label}
                count={m.count}
                maxCount={maxMonthCount}
                isMax={m === stats.busiestMonth}
              />
            ))}
          </div>
          {stats.timeline.length > MAX_TIMELINE_MONTHS && (
            <p className="text-xs text-stone-400 dark:text-slate-500 text-center mt-2">
              Showing last {MAX_TIMELINE_MONTHS} months of{" "}
              {stats.timeline.length}
            </p>
          )}
        </SectionCard>
      )}

      {/* When You Capture */}
      {stats.totalFiles > 0 && (
        <SectionCard
          icon={<ClockIcon className="w-4 h-4" />}
          title="When You Capture"
          delay={0.25}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Day of week */}
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Day of Week
              </p>
              <div className="flex gap-1">
                {DAY_LABELS.map((label, i) => {
                  const count = dowCounts[i]!;
                  const isMax = count === maxDow && count > 0;
                  return (
                    <TimelineBar
                      key={label}
                      label={label}
                      count={count}
                      maxCount={maxDow}
                      isMax={isMax}
                    />
                  );
                })}
              </div>
            </div>

            {/* Time of day */}
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Time of Day
              </p>
              <div className="space-y-2">
                {TIME_PERIODS.map((period, i) => {
                  const count = timePeriodCounts[i]!;
                  const pct = maxTimePeriod > 0 ? (count / maxTimePeriod) * 100 : 0;
                  const isMax = count === maxTimePeriod && count > 0;
                  return (
                    <div key={period.label}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-medium ${
                              isMax
                                ? "text-nx font-semibold"
                                : "text-stone-600 dark:text-slate-400"
                            }`}
                          >
                            {period.label}
                          </span>
                          <span className="text-[10px] text-stone-400 dark:text-slate-500">
                            {period.range}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-mono tabular-nums ${
                            isMax
                              ? "text-nx font-bold"
                              : "text-stone-400 dark:text-slate-500"
                          }`}
                        >
                          {count.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-stone-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isMax
                              ? "bg-gradient-to-r from-nx to-red-400"
                              : "bg-nx/20 dark:bg-nx/15"
                          }`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Fun Facts */}
      {stats.totalFiles > 0 && (
        <SectionCard
          icon={<SparklesIcon className="w-4 h-4" />}
          title="Fun Facts"
          delay={0.3}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {funFacts.busiestDay && (
              <FunFactCard
                title="Most Active Day"
                value={`${funFacts.busiestDay.count} captures`}
                sub={formatDate(funFacts.busiestDay.date)}
              />
            )}
            {funFacts.longestGap && (
              <FunFactCard
                title="Longest Break"
                value={`${funFacts.longestGap.days} days`}
                sub={`${formatDate(funFacts.longestGap.from)} to ${formatDate(funFacts.longestGap.to)}`}
              />
            )}
            {funFacts.singleCaptureGames > 0 && (
              <FunFactCard
                title="One-Hit Wonders"
                value={`${funFacts.singleCaptureGames} game${funFacts.singleCaptureGames !== 1 ? "s" : ""}`}
                sub="with just 1 capture"
              />
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
