/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontSize: {
        xs: ['0.8rem', { lineHeight: '1.25rem' }],
        sm: ['0.95rem', { lineHeight: '1.5rem' }],
      },
    },
  },
  plugins: [],
}
