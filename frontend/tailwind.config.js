/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "Segoe UI", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
      colors: {
        ink: {
          950: "#101614",
          900: "#16201c",
          800: "#1d2b26",
          700: "#2a3c35",
        },
        moss: {
          400: "#5d9b7c",
          500: "#3f7d5e",
          600: "#2f6148",
        },
        sand: {
          50: "#f6f3ec",
          100: "#ece6d8",
          200: "#d8cfbb",
        },
      },
      boxShadow: {
        panel: "0 18px 50px -28px rgba(16, 22, 20, 0.45)",
      },
    },
  },
  plugins: [],
};
