'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Inicializa com tema claro ou recupera do localStorage
  const [theme, setTheme] = useState<Theme>('light');
  
  useEffect(() => {
    // Verificar se estamos no navegador
    if (typeof window !== 'undefined') {
      // Verificar preferência salva no localStorage
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      
      // Se houver uma preferência salva, usá-la
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        // Caso contrário, verificar preferência do sistema
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      }
    }
  }, []);

  useEffect(() => {
    // Verificar se estamos no navegador
    if (typeof window === 'undefined') return;
    
    // Aplicar classe ao elemento html quando o tema mudar
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    
    // Salvar preferência no localStorage
    localStorage.setItem('theme', theme);
    console.log('Tema alterado para:', theme); // Log para debug
  }, [theme]);
  
  // Efeito para aplicar o tema imediatamente após a montagem do componente
  useEffect(() => {
    // Forçar uma atualização do tema
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
