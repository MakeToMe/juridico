// Script para inicializar o tema corretamente
(function() {
  // Função para aplicar o tema
  function applyTheme() {
    try {
      // Verificar preferência salva no localStorage
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Aplicar tema baseado na preferência ou no sistema
      if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
        console.log('Tema escuro aplicado');
      } else {
        document.documentElement.classList.remove('dark');
        console.log('Tema claro aplicado');
      }
    } catch (e) {
      console.error('Erro ao aplicar tema:', e);
    }
  }

  // Aplicar tema imediatamente
  applyTheme();
  
  // Adicionar listener para alterações de tema
  window.addEventListener('storage', function(e) {
    if (e.key === 'theme') {
      applyTheme();
    }
  });
  
  // Expor função para uso global
  window.toggleTheme = function() {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    console.log('Tema alternado para:', isDark ? 'claro' : 'escuro');
  };
})();
