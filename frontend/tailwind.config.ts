import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        navy: {
          950: '#060d1f',
          900: '#0b1630',
          800: '#0f2048',
          700: '#162a5e',
          600: '#1d3570',
        },
        ged: {
          green:  '#10b981',
          red:    '#f43f5e',
          gold:   '#f59e0b',
          cyan:   '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"DM Sans"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-navy':  'linear-gradient(135deg, #0b1630 0%, #060d1f 100%)',
        'gradient-blue':  'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        'gradient-brand': 'linear-gradient(135deg, #1d4ed8 0%, #0f2048 60%, #060d1f 100%)',
        'gradient-card':  'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
      },
      boxShadow: {
        'glow-blue':  '0 0 40px rgba(37,99,235,0.25)',
        'glow-sm':    '0 0 16px rgba(37,99,235,0.18)',
        'card':       '0 4px 24px rgba(0,0,0,0.35)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.45)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease both',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
