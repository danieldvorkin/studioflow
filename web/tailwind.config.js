/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontSize: {
        xs: ['0.85rem', { lineHeight: '1.35rem' }],
        sm: ['1rem', { lineHeight: '1.55rem' }],
        base: ['1.0625rem', { lineHeight: '1.65rem' }],
      },
    },
  },
  plugins: [],
}
