import type { Config } from "tailwindcss";

const config: Config = {

  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        primary: "var(--primary)",
        "vibe-1": "#3B82F6",
        "vibe-2": "#60A5FA",
        "vibe-3": "#93C5FD",
        "vibe-4": "#BFDBFE",
        "vibe-5": "#D1D5DB",
        "vibe-6": "#FCD34D",
        "vibe-7": "#FBBF24",
        "vibe-8": "#F59E0B",
        "vibe-9": "#F97316",
        "vibe-10": "#EA580C",
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Roboto Mono', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
