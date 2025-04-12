'use client';

import { useState, useEffect, ReactNode } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  user: {
    uid: string;
    nome: string;
    email: string;
    role: string;
  };
  children: ReactNode;
}

export default function DashboardLayout({ user, children }: DashboardLayoutProps) {
  // Estado para controlar a abertura/fechamento da sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Efeito para verificar o tamanho da tela e ajustar a sidebar
  useEffect(() => {
    // Verificar se estamos no navegador
    if (typeof window !== 'undefined') {
      // Verificar se há uma preferência salva no localStorage
      const savedState = localStorage.getItem('sidebarOpen');
      if (savedState !== null) {
        setIsSidebarOpen(savedState === 'true');
      } else {
        // Se não houver preferência salva, definir com base no tamanho da tela
        setIsSidebarOpen(window.innerWidth >= 1024);
      }

      // Função para ajustar a sidebar com base no tamanho da tela
      const handleResize = () => {
        if (window.innerWidth < 768) {
          setIsSidebarOpen(false);
        }
      };

      // Adicionar listener para redimensionamento
      window.addEventListener('resize', handleResize);
      
      // Executar uma vez para configuração inicial
      handleResize();

      // Limpar listener ao desmontar
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  // Função para alternar a sidebar
  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    
    // Salvar preferência no localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpen', newState.toString());
    }
  };

  return (
      <div className="h-screen bg-gray-100 dark:bg-dark-secondary text-gray-900 dark:text-white transition-colors duration-200">
        {/* Navbar */}
        <Navbar 
          user={user} 
          toggleSidebar={toggleSidebar} 
          isSidebarOpen={isSidebarOpen} 
        />
        
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        
        {/* Overlay para fechar o sidebar em telas pequenas quando clicado */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 z-10 bg-gray-900 opacity-50 lg:hidden" 
            onClick={toggleSidebar}
            aria-hidden="true"
          ></div>
        )}
        
        {/* Conteúdo principal */}
        <div className={`mt-16 transition-all duration-300 h-[calc(100vh-4rem)] ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} ml-0`}>
          <main className="h-full overflow-y-auto p-4 bg-gray-50 dark:bg-dark-secondary transition-colors duration-200">
            <div className="container mx-auto text-high-contrast dark:text-white">
              {children}
            </div>
          </main>
        </div>
      </div>
  );
}
