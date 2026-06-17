// Static accent class maps. Tailwind purges unseen class names, so every
// literal a component might use is written out here in full.

export type Accent =
  | "cyan"
  | "magenta"
  | "lime"
  | "gold"
  | "violet"
  | "red";

export const ACCENT_TEXT: Record<Accent, string> = {
  cyan: "text-neon-cyan",
  magenta: "text-neon-magenta",
  lime: "text-neon-lime",
  gold: "text-neon-gold",
  violet: "text-neon-violet",
  red: "text-neon-red",
};

export const ACCENT_BORDER: Record<Accent, string> = {
  cyan: "border-neon-cyan",
  magenta: "border-neon-magenta",
  lime: "border-neon-lime",
  gold: "border-neon-gold",
  violet: "border-neon-violet",
  red: "border-neon-red",
};

export const ACCENT_BG: Record<Accent, string> = {
  cyan: "bg-neon-cyan",
  magenta: "bg-neon-magenta",
  lime: "bg-neon-lime",
  gold: "bg-neon-gold",
  violet: "bg-neon-violet",
  red: "bg-neon-red",
};

export function accent(value: string): Accent {
  const known: Accent[] = ["cyan", "magenta", "lime", "gold", "violet", "red"];
  return (known.includes(value as Accent) ? value : "cyan") as Accent;
}
