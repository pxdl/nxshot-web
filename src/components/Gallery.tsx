import { useState } from "react";
import {
  Squares2X2Icon,
  ChartBarIcon,
} from "@heroicons/react/24/solid";
import type { GameGroup } from "../types";
import { GameCard } from "./GameCard";
import { SelectionButton } from "./SelectionButton";
import { CollectionStats } from "./CollectionStats";

type GalleryTab = "gallery" | "stats";

const TABS: { value: GalleryTab; label: string; icon: typeof Squares2X2Icon }[] = [
  { value: "gallery", label: "Gallery", icon: Squares2X2Icon },
  { value: "stats", label: "Stats", icon: ChartBarIcon },
];

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
  const allSelected = selectedGames.size === gameGroups.length;
  const noneSelected = selectedGames.size === 0;

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
              <span className="font-semibold text-stone-800 dark:text-slate-200">
                {gameGroups.length}
              </span>{" "}
              {gameGroups.length === 1 ? "game" : "games"}
              {" · "}
              <span className="font-semibold text-stone-800 dark:text-slate-200">
                {selectedFileCount}
              </span>
              {selectedFileCount !== totalFileCount &&
                ` / ${totalFileCount}`}{" "}
              files selected
            </p>
          )}
        </div>

        {tab === "gallery" && (
          <div className="flex gap-2">
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
        {gameGroups.map((group) => (
          <GameCard
            key={group.gameName}
            group={group}
            selected={selectedGames.has(group.gameName)}
            onToggle={() => onToggleGame(group.gameName)}
          />
        ))}
      </div>
      {tab === "stats" && <CollectionStats gameGroups={gameGroups} />}
    </div>
  );
}
