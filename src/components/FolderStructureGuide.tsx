export function FolderStructureGuide() {
  return (
    <div className="text-sm text-slate-500 dark:text-slate-400">
      <p className="mb-3">
        Select your Nintendo Switch{" "}
        <span className="font-semibold text-slate-600 dark:text-slate-300">Album</span> folder
      </p>
      <div className="bg-slate-200 dark:bg-slate-700 rounded-lg p-3 font-mono text-xs text-left">
        <div className="text-slate-400 dark:text-slate-500">SD Card</div>
        <div className="ml-3">
          <span className="text-slate-400 dark:text-slate-500">└── </span>
          <span>Nintendo/</span>
        </div>
        <div className="ml-8">
          <span className="text-slate-400 dark:text-slate-500">├── </span>
          <span className="text-red-500 font-semibold">Album/</span>
          <span className="text-slate-400 dark:text-slate-500"> ←</span>
        </div>
        <div className="ml-8">
          <span className="text-slate-400 dark:text-slate-500">├── </span>
          <span className="text-slate-400 dark:text-slate-500">Contents/</span>
        </div>
        <div className="ml-8">
          <span className="text-slate-400 dark:text-slate-500">└── </span>
          <span className="text-slate-400 dark:text-slate-500">save/</span>
        </div>
      </div>
    </div>
  );
}
