import type { Config } from "tailwindcss";
import tailwindForms from "@tailwindcss/forms";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#137fec",
        "primary-hover": "#0f65bd",
        "background-light": "#f6f7f8",
        "background-dark": "#101922",
        "surface-light": "#ffffff",
        "surface-dark": "#1a2632",
        "text-main": "#1e293b",
        "text-muted": "#64748b",
        danger: "#ef4444",
        success: "#22c55e",
        warning: "#f59e0b",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      animation: {
        "rotting-pulse": "pulse-red 2s infinite",
      },
      keyframes: {
        "pulse-red": {
          "0%": { boxShadow: "0 0 0 0 rgba(239, 68, 68, 0.4)" },
          "70%": { boxShadow: "0 0 0 6px rgba(239, 68, 68, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(239, 68, 68, 0)" },
        },
      },
    },
  },
  plugins: [tailwindForms],
};
export default config;