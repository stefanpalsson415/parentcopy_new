/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      animation: {
        'loading': 'loading 1.5s ease-in-out infinite',
      },
      keyframes: {
        loading: {
          '0%': { left: '-40%' },
          '100%': { left: '100%' },
        },
      },
    },
  },
  plugins: [],
}