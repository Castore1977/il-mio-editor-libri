/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Dice a Tailwind di analizzare tutti i file JS/JSX in src
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'), // Il tuo editor usa la classe 'prose'
  ],
}