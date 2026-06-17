import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Retro neon space palette on a black void.
        void: "#05060f",
        panel: "#0c1024",
        grid: "#1b2148",
        neon: {
          cyan: "#39e0ff",
          magenta: "#ff4fd8",
          lime: "#9dff5a",
          gold: "#ffd75a",
          violet: "#9b6bff",
          red: "#ff5a6e",
        },
      },
      fontFamily: {
        pixel: ["var(--font-pixel)", "monospace"],
      },
      boxShadow: {
        neon: "0 0 0 2px rgba(57,224,255,0.25), 0 0 16px rgba(57,224,255,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
