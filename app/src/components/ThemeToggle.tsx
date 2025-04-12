'use client';

export default function ThemeToggle() {
  // Função para alternar o tema diretamente no DOM
  const toggleTheme = () => {
    // Verificar o tema atual
    const isDark = document.documentElement.classList.contains('dark');
    
    // Alternar o tema
    if (isDark) {
      // Mudar para tema claro
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      console.log('Tema alterado para: light');
    } else {
      // Mudar para tema escuro
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      console.log('Tema alterado para: dark');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="text-gray-800 dark:text-white hover:text-alnpp dark:hover:text-yellow-300 focus:outline-none"
      aria-label="Alternar tema"
      title="Alternar tema"
    >
      {/* Ícone do sol (modo claro) */}
      <svg
        className="w-6 h-6 hidden dark:inline"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
          clipRule="evenodd"
        />
      </svg>
      
      {/* Ícone da lua (modo escuro) */}
      <svg
        className="w-6 h-6 inline dark:hidden"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
        />
      </svg>
    </button>
  );
}
