import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Barlow'", "'Inter'", "system-ui", "sans-serif"],
        display: ["'Playfair Display'", "Georgia", "serif"],
        ad: ["'Archivo Black'", "'Impact'", "'Arial Black'", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        page: "#FFF7EC",
        card: "#FFF4E3",
        "blue-deep": "#2F4A2A",
        "blue-mid": "#3F7F33",
        "blue-light": "#D4E5D0",
        lenka: {
          red: "#E64748",
          mustard: "#BADBBA",
          cream: "#FFFEF3",
          dark: "#20341A",
          blue: "#3F7F33",
          electric: "#5FAE60",
          midnight: "#0F1F0D",
          gold: "#E64748",
          goldBright: "#F06D6F",
          pink: "#F28C8C",
          teal: "#79C08A",
          pearl: "#E8F2E5",
        },
        gameshow: {
          base: "#11230F",
          electric: "#3F7F33",
          royal: "#2B5A29",
          glow: "#E64748",
          gold: "#BADBBA",
          coral: "#F06D6F",
        },
      },
      boxShadow: {
        "lenka-card": "0 25px 60px rgba(15, 31, 13, 0.38)",
        "lenka-glow": "0 0 25px rgba(230, 71, 72, 0.6)",
        flyer: "0 12px 0 rgba(0, 0, 0, 0.17)",
        "flyer-sm": "0 8px 0 rgba(0, 0, 0, 0.15)",
        "flyer-xs": "0 6px 0 rgba(0, 0, 0, 0.12)",
      },
      backgroundImage: {
        "lenka-stage":
          "radial-gradient(circle at 20% 20%, rgba(121, 192, 138, 0.25), transparent 45%), radial-gradient(circle at 80% 0%, rgba(230, 71, 72, 0.2), transparent 40%), linear-gradient(135deg, #0c160a 0%, #1f3a1a 45%, #0f1f0d 100%)",
        "lenka-panel":
          "linear-gradient(145deg, rgba(32, 70, 35, 0.92), rgba(48, 97, 52, 0.95))",
      },
    },
  },
  plugins: [],
};
export default config;
