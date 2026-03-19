export function FolderStructureGuide() {
  return (
    <div className="text-sm text-stone-500 dark:text-slate-400">
      <p className="mb-3">
        Select your Nintendo Switch{" "}
        <span className="font-semibold text-stone-700 dark:text-slate-200">Album</span> folder
      </p>
      <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-slate-700/50">
        {/* Title bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 dark:bg-[#0d1117] border-b border-stone-200 dark:border-slate-700/50">
          <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
          <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
          <div className="w-2 h-2 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-[11px] text-stone-600 dark:text-slate-400 font-mono">
            SD Card
          </span>
        </div>
        {/* File tree */}
        <div className="bg-stone-50 dark:bg-[#0d1117]/50 px-4 py-3 font-mono text-xs leading-relaxed">
          <div>
            <span className="text-stone-400 dark:text-slate-600">└─ </span>
            <span className="text-stone-600 dark:text-slate-400">Nintendo/</span>
          </div>
          <div className="ml-5">
            <span className="text-stone-400 dark:text-slate-600">├─ </span>
            <span className="text-nx font-semibold">Album/</span>
            <span className="text-stone-500 dark:text-slate-400 ml-2">← select this</span>
          </div>
          <div className="ml-5">
            <span className="text-stone-400 dark:text-slate-600">├─ </span>
            <span className="text-stone-500 dark:text-slate-500">Contents/</span>
          </div>
          <div className="ml-5">
            <span className="text-stone-400 dark:text-slate-600">└─ </span>
            <span className="text-stone-500 dark:text-slate-500">save/</span>
          </div>
        </div>
      </div>
    </div>
  );
}
