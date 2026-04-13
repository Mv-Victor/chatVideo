import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme per spec (zinc-950 color scheme)
        'editor-bg': '#09090b', // zinc-950
        'editor-surface': '#18181b', // zinc-900
        'editor-border': '#27272a', // zinc-800
        'editor-muted': '#3f3f46', // zinc-700
        'editor-text': '#a1a1aa', // zinc-400
        'editor-text-bright': '#e4e4e7', // zinc-200
      },
    },
  },
  plugins: [],
} satisfies Config
