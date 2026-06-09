/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0B0B0B',
          card: '#141414',
          elevated: '#1A1A1A',
        },
        border: {
          subtle: '#1E1E1E',
          default: '#242424',
          strong: '#2E2E2E',
        },
        text: {
          primary: '#F5F5F5',
          secondary: '#A0A0A0',
          muted: '#5A5A5A',
        },
        health: {
          DEFAULT: '#22C55E',
          dim: '#16A34A',
          muted: '#052E16',
          glow: 'rgba(34,197,94,0.15)',
        },
        knowledge: {
          DEFAULT: '#06B6D4',
          dim: '#0891B2',
          muted: '#083344',
          glow: 'rgba(6,182,212,0.15)',
        },
        career: {
          DEFAULT: '#3B82F6',
          dim: '#2563EB',
          muted: '#172554',
          glow: 'rgba(59,130,246,0.15)',
        },
        wealth: {
          DEFAULT: '#F59E0B',
          dim: '#D97706',
          muted: '#451A03',
          glow: 'rgba(245,158,11,0.15)',
        },
        business: {
          DEFAULT: '#A855F7',
          dim: '#9333EA',
          muted: '#2E1065',
          glow: 'rgba(168,85,247,0.15)',
        },
        accent: {
          DEFAULT: '#F5F5F5',
          muted: '#2A2A2A',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.5)',
        glow: '0 0 30px rgba(255,255,255,0.03)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
};
