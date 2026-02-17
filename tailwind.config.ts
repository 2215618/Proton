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
        // Aurora Premium Light palette (Stitch source of truth)
        // Based on: primary #600AFF + accents blue/teal/coral over slate base.
        primary: "#600AFF",
        "primary-hover": "#5208E6",
        "accent-blue": "#3B82F6",
        "accent-teal": "#14B8A6",
        "accent-coral": "#F43F5E",

        "background-light": "#F8FAFC",
        "background-dark": "#101922",
        "surface-light": "#FFFFFF",
        "surface-dark": "#1A2632",

        "text-main": "#0F172A",
        "text-muted": "#64748B",

        // Helpers (glass UI)
        "glass-border": "rgba(255, 255, 255, 0.6)",
        danger: "#ef4444",
        success: "#22c55e",
        warning: "#f59e0b",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        // Aurora design radii
        lg: "1rem",
        xl: "1.5rem",
        "2xl": "2rem",
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
