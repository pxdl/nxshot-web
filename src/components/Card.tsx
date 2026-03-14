import type { ReactNode } from "react";

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="relative bg-white dark:bg-[#161b22] rounded-2xl border border-stone-200/80 dark:border-slate-700/50 shadow-xl dark:shadow-2xl dark:shadow-black/30 overflow-hidden">
      <div className="h-[2px] bg-gradient-to-r from-nx/0 via-nx to-nx/0" />
      <div className="p-6 md:p-8">{children}</div>
    </div>
  );
}
