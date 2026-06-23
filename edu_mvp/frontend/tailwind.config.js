export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        secondary: '#f59e0b',
        student: {
          bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          card: '#ffffff',
          accent: '#10b981',
        },
        admin: {
          bg: '#f8fafc',
          card: '#ffffff',
          accent: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'sans-serif'],
        display: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
