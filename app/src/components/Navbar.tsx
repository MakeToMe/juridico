'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  user: {
    uid: string;
    nome: string;
    email: string;
    role: string;
    perfil?: string;
  };
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export default function Navbar({ user, toggleSidebar, isSidebarOpen }: NavbarProps) {
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Log para debug do campo perfil
  console.log('Dados do usuário na Navbar:', { 
    nome: user.nome, 
    email: user.email, 
    perfil: user.perfil 
  });

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        router.push('/login');
      } else {
        console.error('Falha ao fazer logout');
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-20 w-full bg-white dark:bg-gray-800 transition-colors duration-200 border-none shadow-none" style={{boxShadow: 'none', borderBottom: 'none'}}>
      <div className="flex items-center justify-between h-16 px-4 bg-white dark:bg-gray-800 border-none" style={{boxShadow: 'none', borderBottom: 'none'}}>
        {/* Logo e título */}
        <div className="flex items-center">
          {/* Botão de toggle do sidebar em dispositivos móveis */}
          <button
            onClick={toggleSidebar}
            className="p-2 mr-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {isSidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
          
          {/* Logo */}
          <div className="flex items-center border-none">
            <Image 
              src="https://studio.rardevops.com/storage/v1/object/public/mtm/logo-alnpp.png" 
              alt="ALNPP Logo" 
              width={40} 
              height={40} 
              className="mr-3"
            />
            <h1 className="text-xl font-semibold text-high-contrast dark:text-white border-none">
              ALNPP Advogados
            </h1>
          </div>
        </div>

        {/* Botão de tema e perfil do usuário */}
        <div className="relative flex items-center space-x-4 border-none">
          {/* Botão de alternar tema com estilos forçados */}
          <button
            onClick={() => {
              // Implementação direta do toggle sem depender de função global
              const isDark = document.documentElement.classList.contains('dark');
              if (isDark) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
                console.log('Alterado para tema claro');
              } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
                console.log('Alterado para tema escuro');
              }
              
              // Forçar a atualização de alguns elementos
              setTimeout(() => {
                try {
                  const event = new Event('themeChanged');
                  document.dispatchEvent(event);
                } catch (e) {
                  console.error('Erro ao disparar evento:', e);
                }
              }, 50);
            }}
            className="theme-toggle-button"
            aria-label="Alternar tema"
            title="Alternar tema"
          >
            {/* Ícone do sol (modo claro) */}
            <svg
              className="w-6 h-6 theme-toggle-dark"
              fill="#FFD700"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: '#FFD700' }}
            >
              <path
                fillRule="evenodd"
                d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                clipRule="evenodd"
              />
            </svg>
            
            {/* Ícone da lua (modo escuro) */}
            <svg
              className="w-6 h-6 theme-toggle-light"
              fill="#6B7280"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: '#6B7280' }}
            >
              <path
                d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
              />
            </svg>
          </button>
          
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-alnpp"
            id="user-menu-button"
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
          >
            {user.perfil ? (
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border-none">
                <Image 
                  src={user.perfil} 
                  alt={`Foto de perfil de ${user.nome}`} 
                  width={32} 
                  height={32} 
                  className="object-cover w-full h-full border-none"
                  onError={(e) => {
                    // Se a imagem falhar ao carregar, mostrar a inicial do nome
                    console.error('Erro ao carregar imagem de perfil:', e);
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    // Adicionar um elemento com a inicial do nome
                    const parent = target.parentElement;
                    if (parent) {
                      const span = document.createElement('span');
                      span.className = 'text-sm font-medium border-none';
                      span.style.color = '#1F3626';
                      span.textContent = user.nome.charAt(0).toUpperCase();
                      parent.appendChild(span);
                      // Adicionar estilo de centralização ao parent
                      parent.style.display = 'flex';
                      parent.style.justifyContent = 'center';
                      parent.style.alignItems = 'center';
                    }
                  }}
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center border-none">
                <span className="text-sm font-medium border-none" style={{ color: '#1F3626' }}>
                  {user.nome.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="hidden md:inline-block font-medium" style={{ color: '#1F3626' }}>
              {user.nome}
            </span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: '#1F3626' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown do perfil */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border-none dark:bg-dark-primary transform -translate-x-4">

              <div className="px-4 py-3 border-none bg-gray-50 dark:bg-dark-secondary">
                <p className="text-sm font-medium text-gray-900 dark:text-white border-none">
                  {user.nome}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 border-none">
                  {user.email}
                </p>
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-none"
              >
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-none"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
