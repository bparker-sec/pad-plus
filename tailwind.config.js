/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Notepad++-inspired accent (original palette, not its logo).
        npp: {
          green: '#2e8b57',
          greenDark: '#256e46',
          greenLight: '#4caf7d',
        },
      },
      fontFamily: {
        mono: [
          'Consolas',
          'Menlo',
          'Monaco',
          '"Courier New"',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};
