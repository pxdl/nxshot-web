import { useMemo, useState } from "react";
import {
  Squares2X2Icon,
  ChartBarIcon,
  ChevronUpDownIcon,
} from "@heroicons/react/24/solid";
import type { GameGroup } from "../types";
import { GameCard } from "./GameCard";
import { SelectionButton } from "./SelectionButton";
import { CollectionStats } from "./CollectionStats";

type GalleryTab = "gallery" | "stats";
type SortMode = "count" | "name" | "recent";

const TABS: { value: GalleryTab; label: string; icon: typeof Squares2X2Icon }[] = [
  { value: "gallery", label: "Gallery", icon: Squares2X2Icon },
  { value: "stats", label: "Stats", icon: ChartBarIcon },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "count", label: "Most captures" },
  { value: "name", label: "Name A\u2013Z" },
  { value: "recent", label: "Most recent" },
];

function getLatestTimestamp(group: GameGroup): number {
  let latest = 0;
  for (const f of group.files) {
    const s = f.screenshot;
    // Encode as a single comparable integer (avoids Date allocation)
    const ts = s.year * 10_000_000_000 + s.month * 100_000_000 + s.day * 1_000_000
             + s.hour * 10_000 + s.minute * 100 + s.second;
    if (ts > latest) latest = ts;
  }
  return latest;
}

interface GalleryProps {
  gameGroups: GameGroup[];
  selectedGames: Set<string>;
  selectedFileCount: number;
  totalFileCount: number;
  onToggleGame: (gameName: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function Gallery({
  gameGroups,
  selectedGames,
  selectedFileCount,
  totalFileCount,
  onToggleGame,
  onSelectAll,
  onDeselectAll,
}: GalleryProps) {
  const [tab, setTab] = useState<GalleryTab>("gallery");
  const [sortMode, setSortMode] = useState<SortMode>("count");
  const allSelected = selectedGames.size === gameGroups.length;
  const noneSelected = selectedGames.size === 0;

  const sortedGroups = useMemo(() => {
    const sorted = [...gameGroups];
    switch (sortMode) {
      case "count":
        sorted.sort((a, b) => b.files.length - a.files.length);
        break;
      case "name":
        sorted.sort((a, b) => a.gameName.localeCompare(b.gameName));
        break;
      case "recent": {
        const timestamps = new Map(sorted.map(g => [g, getLatestTimestamp(g)]));
        sorted.sort((a, b) => timestamps.get(b)! - timestamps.get(a)!);
        break;
      }
    }
    return sorted;
  }, [gameGroups, sortMode]);

  const topGameName = useMemo(() => {
    if (gameGroups.length <= 1) return null;
    let top = gameGroups[0]!;
    for (const g of gameGroups) {
      if (g.files.length > top.files.length) top = g;
    }
    return top.gameName;
  }, [gameGroups]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {/* Tab toggle */}
          <div className="flex rounded-lg bg-stone-100 dark:bg-slate-800/80 p-0.5 border border-stone-200/50 dark:border-slate-700/30">
            {TABS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  tab === value
                    ? "bg-white dark:bg-slate-700 text-stone-800 dark:text-slate-200 shadow-sm"
                    : "text-stone-500 dark:text-slate-400 hover:text-stone-700 dark:hover:text-slate-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {tab === "gallery" && (
            <p className="text-sm text-stone-500 dark:text-slate-400">
              <span className="font-display font-bold text-base text-stone-800 dark:text-slate-200">
                {gameGroups.length}
              </span>{" "}
              {gameGroups.length === 1 ? "game" : "games"}
              {" \u00b7 "}
              <span className="font-display font-bold text-base text-stone-800 dark:text-slate-200">
                {selectedFileCount}
              </span>
              {selectedFileCount !== totalFileCount &&
                ` / ${totalFileCount}`}{" "}
              files selected
            </p>
          )}
        </div>

        {tab === "gallery" && (
          <div className="flex items-center gap-2">
            {/* Sort control */}
            <div className="relative">
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="appearance-none text-xs font-medium pl-3 pr-7 py-1.5 rounded-lg bg-stone-100 dark:bg-slate-800/80 text-stone-600 dark:text-slate-300 border border-stone-200/50 dark:border-slate-700/30 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-nx"
              >
                {SORT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <ChevronUpDownIcon className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 dark:text-slate-500 pointer-events-none" />
            </div>

            <SelectionButton onClick={onSelectAll} disabled={allSelected}>
              Select All
            </SelectionButton>
            <SelectionButton onClick={onDeselectAll} disabled={noneSelected}>
              Deselect All
            </SelectionButton>
          </div>
        )}
      </div>

      {/* Content — gallery grid stays mounted to preserve thumbnail cache */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 ${tab !== "gallery" ? "hidden" : ""}`}>
        {sortedGroups.map((group, index) => (
          <GameCard
            key={group.gameName}
            group={group}
            selected={selectedGames.has(group.gameName)}
            onToggle={() => onToggleGame(group.gameName)}
            index={index}
            isTopGame={group.gameName === topGameName}
          />
        ))}
      </div>
      {tab === "stats" && <CollectionStats gameGroups={gameGroups} />}
    </div>
  );
}
