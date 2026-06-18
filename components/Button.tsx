import type { ButtonHTMLAttributes } from "react";
import type { Accent } from "./ui";

// One consistent neon button used across the whole create -> join -> lobby ->
// start -> game flow. Colour is chosen per intent via `variant`; everything
// else (border, radius, hover, active, disabled) stays identical so the UI
// reads as a single system. Full class strings are written out so Tailwind's
// content scan keeps them.

type Variant = Accent;
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  cyan: "border-neon-cyan text-neon-cyan bg-neon-cyan/10 enabled:hover:bg-neon-cyan/20",
  magenta:
    "border-neon-magenta text-neon-magenta bg-neon-magenta/10 enabled:hover:bg-neon-magenta/20",
  lime: "border-neon-lime text-neon-lime bg-neon-lime/10 enabled:hover:bg-neon-lime/20",
  gold: "border-neon-gold text-neon-gold bg-neon-gold/10 enabled:hover:bg-neon-gold/20",
  violet:
    "border-neon-violet text-neon-violet bg-neon-violet/10 enabled:hover:bg-neon-violet/20",
  red: "border-neon-red text-neon-red bg-neon-red/10 enabled:hover:bg-neon-red/20",
};

const SIZE: Record<Size, string> = {
  sm: "px-2 py-1 text-[10px]",
  md: "px-4 py-2 text-sm",
  lg: "px-4 py-3 text-base",
};

const BASE =
  "inline-flex items-center justify-center rounded border-2 font-bold tracking-wider transition enabled:active:scale-95 disabled:cursor-not-allowed disabled:border-grid disabled:bg-transparent disabled:text-slate-600";

export function buttonClass(
  variant: Variant = "cyan",
  size: Size = "md",
  fullWidth = false,
): string {
  return [BASE, VARIANT[variant], SIZE[size], fullWidth ? "w-full" : ""]
    .filter(Boolean)
    .join(" ");
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

export function Button({
  variant = "cyan",
  size = "md",
  fullWidth = false,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`${buttonClass(variant, size, fullWidth)} ${className}`.trim()}
    />
  );
}
