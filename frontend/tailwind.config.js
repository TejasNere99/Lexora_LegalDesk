/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#6C4CF1', hover: '#5738D7' },
        navy: '#26304A',
        cream: '#FFF8ED',
        muted: '#667085',
        success: '#38A978',
        warning: '#8A4B08',
        danger: '#B42318',
        line: '#E7E5EE',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif'],
        display: ['Nunito', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 24px rgba(38, 48, 74, 0.06)',
      },
      borderRadius: {
        card: '16px',
        control: '12px',
      },
    },
  },
  plugins: [],
};
