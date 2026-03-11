/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          foreground: '#FFFFFF',
        },
        sidebar: {
          DEFAULT: '#F8FAFC',
          border: '#E2E8F0',
          active: '#EFF6FF',
          activeText: '#1E40AF',
        },
        background: '#F1F5F9', // Very Light Gray for main page
        text: {
          DEFAULT: '#1E293B',
          muted: '#64748B',
          placeholder: '#94A3B8',
        },
        border: '#E2E8F0',
        success: {
          DEFAULT: '#DCFCE7',
          text: '#166534',
        },
        warning: {
          DEFAULT: '#FEF9C3',
          text: '#854D0E',
        },
        danger: {
          DEFAULT: '#FEE2E2',
          text: '#991B1B',
        },
        info: {
          DEFAULT: '#DBEAFE',
          text: '#1E40AF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
      },
      borderRadius: {
        'card': '12px',
        'ui': '8px',
        'pill': '9999px',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      }
    },
  },
  plugins: [],
}
