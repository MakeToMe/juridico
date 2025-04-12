import { Inter } from 'next/font/google';

// Configuração da fonte Inter com carregamento otimizado
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Isso ajuda a evitar FOIT (Flash of Invisible Text)
  variable: '--font-inter',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
});
