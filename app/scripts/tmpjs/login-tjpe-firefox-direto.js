/**
 * Script de teste para verificar o login no sistema PJe do TJPE
 * Usando apenas Firefox com URL direta
 */

const { firefox } = require('playwright');

// Credenciais para acesso ao TJPE
const credenciais = {
  // URL simplificada, sem parâmetros de sessão
  site: 'https://sso.cloud.pje.jus.br/auth/realms/pje/protocol/openid-connect/auth?client_id=pje-tjpe-1g-cloud&redirect_uri=https%3A%2F%2Fpje.cloud.tjpe.jus.br%2F1g%2Flogin.seam&response_type=code&scope=openid',
  usuario: '84769858434',
  senha: '8476guardia'
};

async function testarLoginTJPE() {
  console.log('Iniciando teste de login no TJPE com Firefox...');
  
  const browser = await firefox.launch({
    headless: false
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
      ignoreHTTPSErrors: true
    });
    
    const page = await context.newPage();
    
    // Navegar para a página de login
    console.log('Navegando para a página de login do TJPE...');
    await page.goto(credenciais.site, { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    // Verificar se o formulário de login está presente
    console.log('Verificando se o formulário de login está presente...');
    await page.waitForSelector('#username', { timeout: 30000 });
    
    // Tirar screenshot da página de login
    await page.screenshot({ path: './tjpe-firefox-login-page.png' });
    
    // Preencher credenciais
    console.log('Preenchendo credenciais...');
    await page.fill('#username', credenciais.usuario);
    await page.fill('#password', credenciais.senha);
    
    // Tirar screenshot antes de clicar
    await page.screenshot({ path: './tjpe-firefox-antes-clique.png' });
    
    // Clicar no botão de login
    console.log('Clicando no botão de login...');
    await Promise.all([
      page.waitForNavigation({ timeout: 60000 }),
      page.click('#kc-login')
    ]);
    
    // Verificar resultado do login
    const url = page.url();
    console.log(`URL após login: ${url}`);
    
    // Tirar screenshot após o login
    await page.screenshot({ path: './tjpe-firefox-apos-login.png' });
    
    if (url.includes('pje.cloud.tjpe.jus.br')) {
      console.log('Login realizado com sucesso!');
      
      // Tentar navegar para a página de consulta
      console.log('Navegando para a página de consulta de processos...');
      await page.goto('https://pje.cloud.tjpe.jus.br/1g/Processo/ConsultaProcesso/listView.seam', {
        timeout: 60000,
        waitUntil: 'networkidle'
      });
      
      // Tirar screenshot da página de consulta
      await page.screenshot({ path: './tjpe-firefox-pagina-consulta.png' });
      
      // Aguardar para visualização manual
      console.log('\nAguardando 1 minuto para visualização manual...');
      console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
      await new Promise(resolve => setTimeout(resolve, 60000));
    } else {
      console.log('Não foi possível confirmar se o login foi bem-sucedido.');
    }
    
  } catch (error) {
    console.error('Erro durante o teste:', error);
  } finally {
    // Fechar o navegador
    console.log('Fechando o navegador...');
    await browser.close();
    console.log('Navegador fechado com sucesso!');
  }
}

// Executar o teste
testarLoginTJPE();
