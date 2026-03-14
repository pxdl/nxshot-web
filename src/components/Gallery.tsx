import type { GameGroup } from "../types";
import { GameCard } from "./GameCard";
import { SelectionButton } from "./SelectionButton";

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
  const allSelected = selectedGames.size === gameGroups.length;
  const noneSelected = selectedGames.size === 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
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
        <div className="flex gap-2">
          <SelectionButton onClick={onSelectAll} disabled={allSelected}>
            Select All
          </SelectionButton>
          <SelectionButton onClick={onDeselectAll} disabled={noneSelected}>
            Deselect All
          </SelectionButton>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {gameGroups.map((group) => (
          <GameCard
            key={group.gameName}
            group={group}
            selected={selectedGames.has(group.gameName)}
            onToggle={() => onToggleGame(group.gameName)}
          />
        ))}
      </div>
    </div>
  );
}
