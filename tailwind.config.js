/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#006c4f",
          dark: "#00513b",
          light: "#9df4cf",
        },
        background: "#f8fafc",
        surface: {
          DEFAULT: "#ffffff",
          low: "#f1f5f9",
          border: "#e2e8f0",
        },
        text: {
          primary: "#1e293b",
          secondary: "#64748b",
          dark: "#0d1c2e",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Manrope", "sans-serif"],
      },
      borderRadius: {
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.03)',
        'active-glow': '0 12px 32px rgba(0, 108, 79, 0.08)',
      }
    },
  },
  plugins: [],
}
