/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Orbitron', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Rajdhani', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        deck: {
          void: '#04070f',
          abyss: '#070c18',
          hull: '#0b1220',
          plate: '#101a2e',
          line: '#1e2c47',
        },
        neon: {
          cyan: '#22e4ff',
          ice: '#7df9ff',
          pink: '#ff2d9b',
          magenta: '#ff5ec4',
          amber: '#ffb627',
          lime: '#9dff3d',
          violet: '#a855f7',
          red: '#ff3d5a',
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 6px rgba(34,228,255,0.55), 0 0 22px rgba(34,228,255,0.25)',
        'glow-cyan-lg': '0 0 12px rgba(34,228,255,0.7), 0 0 44px rgba(34,228,255,0.35)',
        'glow-pink': '0 0 6px rgba(255,45,155,0.55), 0 0 22px rgba(255,45,155,0.25)',
        'glow-pink-lg': '0 0 12px rgba(255,45,155,0.7), 0 0 44px rgba(255,45,155,0.35)',
        'glow-amber': '0 0 6px rgba(255,182,39,0.55), 0 0 22px rgba(255,182,39,0.25)',
        'glow-lime': '0 0 6px rgba(157,255,61,0.55), 0 0 22px rgba(157,255,61,0.25)',
        'glow-violet': '0 0 6px rgba(168,85,247,0.55), 0 0 22px rgba(168,85,247,0.25)',
        'glow-red': '0 0 6px rgba(255,61,90,0.6), 0 0 22px rgba(255,61,90,0.3)',
        panel: '0 24px 70px -20px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      dropShadow: {
        'neon-cyan': ['0 0 4px rgba(34,228,255,0.9)', '0 0 12px rgba(34,228,255,0.45)'],
        'neon-pink': ['0 0 4px rgba(255,45,155,0.9)', '0 0 12px rgba(255,45,155,0.45)'],
      },
      backgroundImage: {
        'grid-fine':
          'linear-gradient(rgba(34,228,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(34,228,255,0.10) 1px, transparent 1px)',
        'grid-coarse':
          'linear-gradient(rgba(34,228,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(34,228,255,0.16) 1px, transparent 1px)',
        vignette:
          'radial-gradient(ellipse at center, transparent 35%, rgba(2,4,10,0.55) 72%, rgba(2,4,10,0.95) 100%)',
        'hud-sweep':
          'linear-gradient(115deg, transparent 0%, rgba(34,228,255,0.14) 45%, rgba(255,45,155,0.12) 55%, transparent 100%)',
      },
      backgroundSize: {
        'grid-fine': '28px 28px',
        'grid-coarse': '96px 96px',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '41%': { opacity: '1' },
          '42%': { opacity: '0.55' },
          '43%': { opacity: '1' },
          '77%': { opacity: '1' },
          '78%': { opacity: '0.7' },
          '79%': { opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.08)' },
        },
        'sweep-x': {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        'data-stream': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% -400px' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
      },
      animation: {
        scanline: 'scanline 7s linear infinite',
        flicker: 'flicker 6s linear infinite',
        'pulse-glow': 'pulse-glow 2.2s ease-in-out infinite',
        'sweep-x': 'sweep-x 3.5s ease-in-out infinite',
        'spin-slow': 'spin-slow 14s linear infinite',
        'data-stream': 'data-stream 12s linear infinite',
        blink: 'blink 1.05s step-end infinite',
      },
    },
  },
  plugins: [],
};
