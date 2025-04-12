'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar?: () => void;
}

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();
  
  // Lista de itens do menu
  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { name: 'Consulta Processual', href: '/dashboard/consulta', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { name: 'Processos Salvos', href: '/dashboard/processos', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { name: 'Relatórios', href: '/dashboard/relatorios', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { name: 'Configurações', href: '/dashboard/configuracoes', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ];

  // Detectar o tema atual
  const isDarkMode = typeof window !== 'undefined' ? document.documentElement.classList.contains('dark') : false;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${isOpen ? 'w-64 lg:w-64' : 'w-20 lg:w-20'} transition-all duration-300 ease-in-out flex flex-col top-16`}
    >
      <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200 overflow-y-auto">
        {/* Botão de retrair/expandir sidebar (visível apenas em telas grandes) */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex lg:items-center lg:justify-center h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 absolute right-0 top-20 transform translate-x-1/2 border shadow-sm z-30"
          aria-label={isOpen ? 'Retrair sidebar' : 'Expandir sidebar'}
        >
          <svg 
            className="w-3 h-3"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            )}
          </svg>
        </button>

        <nav className="px-4 py-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-2 rounded-lg no-underline ${pathname === item.href ? 'bg-white dark:bg-gray-700 text-alnpp dark:text-white font-semibold' : 'text-gray-900 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'} transition-colors ${isOpen ? '' : 'justify-center'}`}
                >
                  <svg 
                    className="w-5 h-5"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon}></path>
                  </svg>
                  <span className={`ml-3 ${isOpen ? '' : 'hidden'} ${pathname === item.href ? 'font-bold' : ''}`}>{item.name}</span>
                  {!isOpen && (
                    <span className="sr-only">{item.name}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      
      {/* Rodapé fixo na parte inferior */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 mt-auto bg-white dark:bg-gray-800">
        <div className={`text-xs font-medium ${isOpen ? '' : 'text-center'}`}>
          <div className="mb-1 font-semibold text-sm text-gray-900 dark:text-gray-300">© 2025 ALNPP Advogados</div>
          <div className="text-xs text-gray-900 dark:text-gray-400">v1.0.0</div>
        </div>
      </div>
    </aside>
  );
}
