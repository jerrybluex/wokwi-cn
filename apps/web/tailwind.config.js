/** @type {import('tailwindcss').Config} */
import daisyui from 'daisyui';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Outfit',
          'PingFang SC',
          'Microsoft YaHei',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
      colors: {
        // Brand tokens — see docs/designs/design-system.html
        cream: '#f7f5f0',
        paper: '#ffffff',
        ink: '#14171e',
        'ink-soft': '#3a4256',
        muted: '#7c7a72',
        line: '#e9e3d6',
        'line-soft': '#efeadd',
        // Canvas tokens — used by CanvasPanel + parts SVG, see §08
        'canvas-bg': '#1a1d24',
        'canvas-grid': '#262a33',
        'canvas-grid-major': '#34394a',
        'canvas-wire': '#e07a5f',
        'canvas-pin': '#5a6173',
        'canvas-pin-active': '#ffb300',
        'canvas-select': '#5b9dd9',
        'canvas-text': '#d8dee9',
        'canvas-board': '#1a4a8a',
      },
      borderRadius: {
        card: '10px',
        panel: '14px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(20, 23, 30, 0.04)',
        'card-hover': '0 4px 16px -2px rgba(20, 23, 30, 0.06)',
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        wokwi: {
          primary: '#c97b3f',
          'primary-content': '#ffffff',
          secondary: '#2f6f5e',
          'secondary-content': '#ffffff',
          accent: '#5b7fa8',
          'accent-content': '#ffffff',
          neutral: '#3a4256',
          'neutral-content': '#f7f5f0',
          'base-100': '#ffffff',
          'base-200': '#fbf8f1',
          'base-300': '#e9e3d6',
          'base-content': '#14171e',
          info: '#5b7fa8',
          'info-content': '#ffffff',
          success: '#3f8c6a',
          'success-content': '#ffffff',
          warning: '#b06367',
          'warning-content': '#ffffff',
          error: '#b85252',
          'error-content': '#ffffff',
        },
      },
      'light',
      'dark',
    ],
    logs: false,
  },
};
