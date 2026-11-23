import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1180px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        achievement: "hsl(var(--achievement))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist)", "Geist", "system-ui", "sans-serif"],
        serif: ["var(--font-geist)", "Geist", "system-ui", "sans-serif"],
        mono: [
          "var(--font-geist-mono)",
          "Geist Mono",
          "ui-monospace",
          "monospace",
        ],
      },
      boxShadow: {
        aura: "0 24px 80px rgba(0, 0, 0, 0.35)",
      },
      backgroundImage: {
        "aura-radial":
          "linear-gradient(145deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
