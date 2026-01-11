import { type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  icon?: ReactNode;
}

const baseStyles =
  "w-full py-4 px-6 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30 hover:shadow-xl disabled:hover:shadow-lg",
  secondary:
    "bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-600 dark:to-slate-700 hover:from-slate-800 hover:to-slate-900 dark:hover:from-slate-500 dark:hover:to-slate-600 text-white shadow-lg shadow-slate-300 dark:shadow-slate-900/50 hover:shadow-xl disabled:hover:shadow-lg",
  ghost:
    "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 shadow-lg shadow-slate-300 dark:shadow-slate-900/30 hover:shadow-xl",
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
      className={`${baseStyles} ${variantStyles[variant]}`}
    >
      <span className="flex items-center justify-center gap-3">
        {icon}
        <span>{children}</span>
      </span>
    </button>
  );
}
