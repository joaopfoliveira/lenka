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
        sans: ["'Poppins'", "'Inter'", "system-ui", "sans-serif"],
        display: ["'Bungee'", "'Luckiest Guy'", "cursive", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        lenka: {
          red: "#FF3B1F",
          mustard: "#E2B22C",
          cream: "#FFF8E7",
          dark: "#2C1810",
          blue: "#0B1B6B",
          electric: "#1E4BFF",
          midnight: "#050B2C",
          gold: "#F5C349",
          goldBright: "#FFDF6C",
          pink: "#FF5D9E",
          teal: "#2DE0C6",
          pearl: "#F3F6FF",
        },
        gameshow: {
          base: "#060C3B",
          electric: "#1039C5",
          royal: "#251678",
          glow: "#4D8DFF",
          gold: "#FFD76F",
          coral: "#FF7D9E",
        },
      },
      boxShadow: {
        "lenka-card": "0 25px 60px rgba(5, 11, 44, 0.45)",
        "lenka-glow": "0 0 25px rgba(255, 215, 111, 0.7)",
      },
      backgroundImage: {
        "lenka-stage":
          "radial-gradient(circle at 20% 20%, rgba(77, 141, 255, 0.35), transparent 45%), radial-gradient(circle at 80% 0%, rgba(255, 125, 158, 0.25), transparent 40%), linear-gradient(135deg, #030821 0%, #0b1b6b 45%, #020412 100%)",
        "lenka-panel":
          "linear-gradient(145deg, rgba(10, 18, 70, 0.9), rgba(27, 43, 120, 0.95))",
      },
    },
  },
  plugins: [],
};
export default config;
