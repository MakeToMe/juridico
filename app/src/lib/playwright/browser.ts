/**
 * Responsável por inicializar e gerenciar o navegador
 */

import { chromium, firefox, webkit, Browser, BrowserContext, Page, BrowserType } from 'playwright';

// Tipo de navegador a ser usado (pode ser configurado via variável de ambiente)
const BROWSER_TYPE = process.env.BROWSER_TYPE || 'chromium';

/**
 * Obtém o tipo de navegador baseado na configuração
 * @returns Instância do tipo de navegador
 */
function getBrowserType(): BrowserType {
  switch (BROWSER_TYPE.toLowerCase()) {
    case 'firefox':
      return firefox;
    case 'webkit':
      return webkit;
    case 'chromium':
    default:
      return chromium;
  }
}

/**
 * Inicia uma instância do navegador usando o Playwright
 * @returns Objeto contendo as referências para browser, context e page
 */
export async function iniciarNavegador() {
  // Obter o tipo de navegador configurado
  const browserType = getBrowserType();
  
  // Iniciar o navegador com opções avançadas
  const browser = await browserType.launch({
    headless: true, // true para produção, false para debug
    args: ['--disable-dev-shm-usage'], // Evita problemas de memória em ambientes CI
    timeout: 30000, // 30 segundos de timeout para inicialização
  });
  
  // Criar um contexto com configurações otimizadas
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    ignoreHTTPSErrors: true, // Ignorar erros de certificado HTTPS
    javaScriptEnabled: true,
  });
  
  // Configurar timeouts para navegação
  context.setDefaultTimeout(30000); // 30 segundos para todas as operações
  context.setDefaultNavigationTimeout(60000); // 60 segundos para navegação
  
  // Criar uma nova página
  const page = await context.newPage();
  
  // Configurar handlers para diálogos
  page.on('dialog', async dialog => {
    console.log(`Diálogo ${dialog.type()} exibido: ${dialog.message()}`);
    await dialog.dismiss(); // Fechar automaticamente qualquer diálogo
  });
  
  return { browser, context, page };
}

/**
 * Fecha a instância do navegador e todos os seus recursos
 * @param browser Instância do navegador a ser fechada
 */
export async function fecharNavegador(browser: Browser) {
  if (!browser) return;
  
  try {
    await browser.close();
    console.log('Navegador fechado com sucesso');
  } catch (error) {
    console.error('Erro ao fechar o navegador:', error);
  }
}
