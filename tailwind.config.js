/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#0a0a0f',
        'card-dark': '#12121a',
        'accent-blue': '#3b82f6',
        'accent-purple': '#8b5cf6',
        'accent-pink': '#ec4899',
      },
    },
  },
  plugins: [],
}
