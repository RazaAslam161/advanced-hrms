import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#7F63F4',
        secondary: '#9A85FF',
        accent: '#FFC107',
        surface: '#F7F3FF',
        ink: '#140A25',
        night: '#16101F',
        plum: '#1B1337',
        panel: '#2A224A',
        muted: '#A8A2C5',
      },
      boxShadow: {
        panel: '0 24px 70px rgba(20, 10, 37, 0.24)',
        glow: '0 0 0 1px rgba(154, 133, 255, 0.2), 0 20px 60px rgba(127, 99, 244, 0.22)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
