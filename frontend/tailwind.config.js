/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        brand: {
          50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 300: "#a5b4fc", 400: "#818cf8",
          500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 800: "#3730a3", 900: "#312e81",
        },
      },
      boxShadow: { card: "0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.05)" },
      keyframes: {
        "slide-in": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "pop": { from: { opacity: "0", transform: "scale(.97) translateY(6px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        "slide-in": "slide-in .22s cubic-bezier(.2,.8,.2,1)",
        "fade-in": "fade-in .18s ease-out",
        "pop": "pop .2s cubic-bezier(.2,.8,.2,1)",
      },
    },
  },
  plugins: [],
};
