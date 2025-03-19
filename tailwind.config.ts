import type { Config } from "tailwindcss";
import plugin from 'tailwindcss/plugin';

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        'gradient': 'gradient 8s linear infinite',
        'fade-in': 'fadeIn 0.7s ease-in forwards',
        'fade-out': 'fadeOut 0.7s ease-out forwards',
        'slide-in': 'slideIn 0.7s ease-out forwards',
        'gradient-flow': 'gradient-shift 8s linear infinite',
        'bob': 'bobbing 2s ease-in-out infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-1rem)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        bobbing: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      textShadow: {
        'glow': '0 0 4px rgba(205, 127, 50, 0.5), 0 0 8px rgba(205, 127, 50, 0.3), 0 0 12px rgba(205, 127, 50, 0.2)',
        'glow-yellow': '0 0 4px rgba(255, 255, 0, 0.6), 0 0 8px rgba(255, 215, 0, 0.4), 0 0 12px rgba(255, 255, 0, 0.3)',
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      const newUtilities = {
        '.text-shadow-glow': {
          textShadow: '0 0 4px rgba(205, 127, 50, 0.5), 0 0 8px rgba(205, 127, 50, 0.3), 0 0 12px rgba(205, 127, 50, 0.2)',
        },
        '.text-shadow-glow-yellow': {
          textShadow: '0 0 4px rgba(255, 255, 0, 0.6), 0 0 8px rgba(255, 215, 0, 0.4), 0 0 12px rgba(255, 255, 0, 0.3)',
        }
      }
      addUtilities(newUtilities)
    })
  ],
} satisfies Config;
