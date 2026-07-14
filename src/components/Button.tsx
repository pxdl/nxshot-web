import { type ReactNode } from "react";
import {
  buttonBaseStyles,
  buttonVariantStyles,
  type ButtonVariant,
} from "./buttonStyles";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  icon?: ReactNode;
}

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
