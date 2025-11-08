import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        lenka: {
          red: '#FF3B1F',
          mustard: '#E2B22C',
          cream: '#FFF8E7',
          dark: '#2C1810',
        },
      },
    },
  },
  plugins: [],
};
export default config;

