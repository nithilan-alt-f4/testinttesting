// Brutalist monochrome design system
// No color themes — everything is black/white/gray with one accent red.

export type PlayerTheme = "default";

export const themeStyles = {
  default: {
    text: "text-zinc-300",
    hoverText: "hover:text-white",
    bg: "bg-zinc-800",
    hoverBg: "hover:bg-zinc-700",
    border: "border-zinc-600",
    focusBorder: "focus:border-zinc-500/50",
    accent: "accent-zinc-600",
    pulseBg: "bg-zinc-900/40",
    pulseBorder: "border-zinc-800",
    pulseText: "text-zinc-300",
    badge: "bg-zinc-900 text-zinc-300 border-zinc-800",
    glow: "shadow-zinc-950/40",
  },
};

// Monochrome gradient for backgrounds — always grayscale
export const getThemeGradient = (_theme: PlayerTheme, _seed: string = "") => {
  return "from-zinc-800 to-zinc-950";
};

// Active accent for playback indicators — red only
export const ACCENT_RED = "text-red-500";
export const ACCENT_RED_BG = "bg-red-500";
export const ACCENT_RED_HOVER = "hover:bg-red-400";
export const ACCENT_RED_BORDER = "border-red-500";
