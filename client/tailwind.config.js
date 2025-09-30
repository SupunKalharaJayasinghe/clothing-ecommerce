/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Breakpoints
      screens: {
        'xs': '20rem',
        'sm': '40rem',
        'md': '48rem',
        'lg': '64rem',
        'xl': '80rem',
        '2xl': '96rem',
      },
      colors: {
        // Minimal Neutral Palette
        brand: {
          50: '#f6f8ff',
          100: '#eef2ff',
          200: '#e0e7ff',
          300: '#c7d2fe',
          400: '#93c5fd',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Secondary: Neon Cyan
        cyan: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        // Accent: Electric Pink
        pink: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
        // Warning: Neon Orange
        orange: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        },
        // Dark Theme - Matching Admin Dashboard
        bg: '#0a0e1a',
        'bg-soft': '#111827',
        'bg-muted': '#1f2937',
        surface: 'rgba(17, 24, 39, 0.8)',
        'surface-elevated': 'rgba(31, 41, 55, 0.9)',
        'surface-hover': 'rgba(55, 65, 81, 0.9)',
        'surface-glass': 'rgba(255, 255, 255, 0.05)',
        border: 'rgba(148, 163, 184, 0.1)',
        'border-hover': 'rgba(148, 163, 184, 0.2)',
        'text-high': '#f8fafc',
        'text-medium': '#cbd5e1',
        muted: '#94a3b8',
      },
      borderRadius: {
        'sm': '0.5rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.5rem',
      },
      boxShadow: {
        'sm': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'md': '0 8px 32px rgba(0, 0, 0, 0.2)',
        'lg': '0 16px 64px rgba(0, 0, 0, 0.3)',
        'xl': '0 24px 80px rgba(0, 0, 0, 0.4)',
        'glow': '0 0 32px rgba(59, 130, 246, 0.15)',
        'cyan': '0 0 32px rgba(6, 182, 212, 0.15)',
        'pink': '0 0 32px rgba(236, 72, 153, 0.15)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #06b6d4 0%, #ec4899 100%)',
        'gradient-accent': 'linear-gradient(135deg, #f472b6 0%, #3b82f6 100%)',
        'gradient-warm': 'linear-gradient(135deg, #3b82f6 0%, #f97316 100%)',
        'gradient': 'linear-gradient(135deg, #0a0e1a 0%, #1a1f36 50%, #0f172a 100%)',
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        'slide-up': 'slide-up 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in-up': 'fade-in-up 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-in': 'bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'rotate-in': 'rotate-in 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        'gradient': 'gradient-shift 3s ease infinite',
        'particle': 'particle-float 6s ease-in-out infinite',
        'drawer-pop': 'drawer-pop 180ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-8px) rotate(1deg)' },
          '66%': { transform: 'translateY(-4px) rotate(-0.5deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: 'var(--shadow-md)' },
          '50%': { boxShadow: 'var(--shadow-glow)' },
        },
        'slide-up': {
          from: { transform: 'translateY(30px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.9)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        'fade-in-up': {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'rotate-in': {
          from: { transform: 'rotate(-180deg) scale(0.8)', opacity: '0' },
          to: { transform: 'rotate(0deg) scale(1)', opacity: '1' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'particle-float': {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '33%': { transform: 'translateY(-10px) translateX(5px)' },
          '66%': { transform: 'translateY(-5px) translateX(-3px)' },
        },
        'drawer-pop': {
          from: { opacity: '0', transform: 'translateX(-8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem',
      },
    },
  },
  plugins: [],
}
