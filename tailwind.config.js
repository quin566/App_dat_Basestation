/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./v3-index.html",
    "./src/v3/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          DEFAULT: '#5F6F65',
          deep: '#434D46',
        },
        linen: '#FDFCFB',
        charcoal: '#332F2E',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
