/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Habilita o modo escuro baseado em classes
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cores personalizadas para o tema
        'alnpp': {
          light: '#1F3626',
          DEFAULT: '#1F3626',
          dark: '#152419',
        },
      },
      backgroundColor: {
        'dark-primary': '#121212',
        'dark-secondary': '#1e1e1e',
        'dark-accent': '#2d2d2d',
      },
      textColor: {
        'dark-primary': '#ffffff',
        'dark-secondary': '#e2e8f0',
        'dark-muted': '#a0aec0',
      },
      borderColor: {
        'dark-border': '#4b5563',
      },
    },
  },
  plugins: [],
}
