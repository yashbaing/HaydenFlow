import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        nexora: {
          bg: '#08090e',
          surface: '#0f1118',
          'surface-2': '#161b28',
          border: '#1e2433',
          'border-2': '#252d40',
          text: '#e8eaf0',
          muted: '#8892a4',
          subtle: '#4a5568',
          blue: '#4F8EF7',
          'blue-dim': '#1e3a6e',
          green: '#00D4AA',
          'green-dim': '#003d30',
          amber: '#F5A623',
          'amber-dim': '#3d2800',
          red: '#F25757',
          'red-dim': '#3d0f0f',
          purple: '#9B6DFF',
          'purple-dim': '#1e1040',
        },
      },
      backgroundImage: {
        'gradient-nexora': 'linear-gradient(135deg, #4F8EF7, #00D4AA)',
        'gradient-dark': 'linear-gradient(180deg, #0f1118 0%, #08090e 100%)',
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'nexora-blue': '0 0 20px rgba(79, 142, 247, 0.2)',
        'nexora-green': '0 0 20px rgba(0, 212, 170, 0.2)',
        'glow-blue': '0 0 40px rgba(79, 142, 247, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
