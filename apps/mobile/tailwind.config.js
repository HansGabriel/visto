/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    "./App.tsx", 
    "./screens/**/*.{js,jsx,ts,tsx}", 
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'space-dark': '#0a0e27',
        'space-purple': '#1a1a3e',
        'accent-pink': '#e91e63',
        'accent-blue': '#3b82f6',
      },
    },
  },
  plugins: [],
}