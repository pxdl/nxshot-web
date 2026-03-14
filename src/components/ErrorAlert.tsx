import {
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import type { ReactNode } from "react";

type AlertVariant = "error" | "warning";

const variantStyles: Record<
  AlertVariant,
  { container: string; icon: string; text: string }
> = {
  error: {
    container:
      "bg-red-50 dark:bg-red-950/30 border-red-200/60 dark:border-red-900/50",
    icon: "text-red-500",
    text: "text-red-700 dark:text-red-400",
  },
  warning: {
    container:
      "bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-900/50",
    icon: "text-amber-500",
    text: "text-amber-700 dark:text-amber-400",
  },
};

const variantIcons: Record<AlertVariant, typeof ExclamationCircleIcon> = {
  error: ExclamationCircleIcon,
  warning: ExclamationTriangleIcon,
};

export function ErrorAlert({
  children,
  message,
  variant = "error",
  className,
}: {
  children?: ReactNode;
  message?: string;
  variant?: AlertVariant;
  className?: string;
}) {
  const styles = variantStyles[variant];
  const Icon = variantIcons[variant];

  return (
    <div
      role="alert"
      className={`p-4 rounded-xl border ${styles.container} ${className ?? ""}`}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`}
          aria-hidden="true"
        />
        <div className={`text-sm ${styles.text}`}>
          {message && <p>{message}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
