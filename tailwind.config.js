/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1976d2',
        accent: '#ff4081',
      }
    },
  },
  plugins: [],
}
