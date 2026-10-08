import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ['"Chivo Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      colors: {
        brand: {
          blue: "#0062ff",
          blueHover: "#0052d9",
          dark: "#0f1117",
          darkCard: "#131620",
          bg: "#f0f3f8",
          card: "#ffffff",
          lime: "#ccf82f",
          orange: "#ff7324",
          emerald: "#10b981",
          purple: "#8b5cf6",
          cyan: "#0ea5e9",
          slateBg: "#e8edf5",
        },
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0, 0, 0, 0.04)",
        card: "0 4px 20px rgba(0, 0, 0, 0.03)",
        glow: "0 10px 25px -5px rgba(0, 98, 255, 0.3)",
      },
      borderRadius: {
        "2xl": "20px",
        "3xl": "28px",
        "4xl": "36px",
      },
    },
  },
  plugins: [],
};

export default config;
