/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class", // não usado: o portal é sempre claro
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Source Sans 3'", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["'Source Serif 4'", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Azul institucional
        brand: {
          50: "#f2f5fa", 100: "#e2e9f4", 200: "#c5d3e8", 300: "#97b0d4", 400: "#6185b9",
          500: "#3d63a0", 600: "#2c4d85", 700: "#233f6d", 800: "#1c3359", 900: "#152745", 950: "#0d1a31",
        },
        // Dourado de destaque
        ouro: { 50: "#fbf7ea", 100: "#f4eac6", 300: "#e2c56f", 400: "#d4ae46", 500: "#bf972a", 600: "#9c7a1f", 700: "#7a5f19" },
        papel: "#f6f5f1",
      },
      boxShadow: { card: "0 1px 2px rgba(16,24,40,.05)", elev: "0 8px 24px rgba(16,24,40,.08)" },
      keyframes: {
        "slide-in": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        pop: { from: { opacity: "0", transform: "scale(.98) translateY(4px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        "slide-in": "slide-in .22s cubic-bezier(.2,.8,.2,1)",
        "fade-in": "fade-in .18s ease-out",
        pop: "pop .18s cubic-bezier(.2,.8,.2,1)",
      },
    },
  },
  plugins: [],
};
