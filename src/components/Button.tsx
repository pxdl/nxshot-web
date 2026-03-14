import { type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  icon?: ReactNode;
}

export const buttonBaseStyles =
  "w-full py-4 px-6 font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer";

export const buttonVariantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-nx hover:bg-nx-dark text-white shadow-lg shadow-nx/25 dark:shadow-nx/15 hover:shadow-xl hover:shadow-nx/30 disabled:hover:shadow-lg",
  secondary:
    "bg-stone-800 dark:bg-slate-600 hover:bg-stone-700 dark:hover:bg-slate-500 text-white shadow-lg shadow-stone-900/20 dark:shadow-black/30 hover:shadow-xl disabled:hover:shadow-lg",
  ghost:
    "bg-transparent hover:bg-stone-100 dark:hover:bg-slate-800/80 text-stone-500 dark:text-slate-400 border border-stone-200 dark:border-slate-700 hover:border-stone-300 dark:hover:border-slate-600",
};

export function Button({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  icon,
}: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${buttonBaseStyles} ${buttonVariantStyles[variant]}`}
    >
      <span className="flex items-center justify-center gap-3">
        {icon}
        <span>{children}</span>
      </span>
    </button>
  );
}
