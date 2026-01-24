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
        // Specialty colors
        surgical: { DEFAULT: "#EF4444", light: "#FEE2E2", dark: "#DC2626" },
        medical: { DEFAULT: "#3B82F6", light: "#DBEAFE", dark: "#2563EB" },
        radiation: { DEFAULT: "#F59E0B", light: "#FEF3C7", dark: "#D97706" },
        palliative: { DEFAULT: "#8B5CF6", light: "#EDE9FE", dark: "#7C3AED" },
        radiology: { DEFAULT: "#06B6D4", light: "#CFFAFE", dark: "#0891B2" },
        pathology: { DEFAULT: "#EC4899", light: "#FCE7F3", dark: "#DB2777" },
        genetics: { DEFAULT: "#10B981", light: "#D1FAE5", dark: "#059669" },
        conductor: { DEFAULT: "#6366F1", light: "#E0E7FF", dark: "#4F46E5" },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "typing": "typing 1s steps(20) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
