import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./theme.css"; // Importar estilos específicos para o tema

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
  preload: false,
  adjustFontFallback: false
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: false,
  adjustFontFallback: false
});

export const metadata: Metadata = {
  title: "ALNPP Advocacia | Excelência Jurídica",
  description: "Escritório de advocacia especializado em direito civil, empresarial, trabalhista e tributário. Atendimento personalizado e soluções jurídicas eficientes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* CSS para forçar estilos do tema */}
        <link rel="stylesheet" href="/force-theme.css" />
        {/* CSS para remover todas as bordas */}
        <link rel="stylesheet" href="/no-borders.css" />
        {/* Script para aplicar o tema - usando um arquivo externo */}
        <script src="/theme-init.js" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
