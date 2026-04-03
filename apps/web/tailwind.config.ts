import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080808',
        surface: '#0f0f0f',
        'surface-raised': '#161616',
        accent: '#00C896',
        'accent-dim': 'rgba(0,200,150,0.15)',
        danger: '#ff4444',
        warning: '#f59e0b',
        'text-primary': '#f0f0f0',
        'text-secondary': '#888888',
        'text-tertiary': '#555555',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.08)',
        hover: 'rgba(255,255,255,0.15)',
      },
      transitionDuration: {
        150: '150ms',
      },
    },
  },
};

export default config;