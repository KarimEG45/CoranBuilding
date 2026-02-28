import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          400: '#f5c842',
          500: '#e6b422',
          600: '#c49a10',
        },
      },
      fontFamily: {
        arabic: ['Scheherazade New', 'Amiri', 'serif'],
      },
    },
  },
  plugins: [],
}

export default config
