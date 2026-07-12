/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './index.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef8ff',
          100: '#d8efff',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        ink: '#111827',
        gold: '#d4af37',
      },
    },
  },
  plugins: [],
};