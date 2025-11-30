/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#0f0c29',
        'brand-purple': '#302b63',
        'brand-blue': '#24243e',
        'accent-cyan': '#00d2ff',
        'accent-blue': '#3a7bd5',
        'card-bg': '#1e1e2f',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
