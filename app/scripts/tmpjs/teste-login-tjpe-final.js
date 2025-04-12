/**
 * Script de teste para verificar o login no sistema PJe do TJPE
 * Versão final otimizada
 */

const { chromium } = require('playwright');

// Credenciais para acesso ao TJPE
const credenciais = {
  usuario: '84769858434',
  senha: '8476guardia'
};

/**
 * Realiza o login no sistema PJe do TJPE
 */
async function realizarLoginTJPE(page, credenciais) {
  try {
    console.log('Navegando para a página de login do TJPE...');
    
    // URL direta para o PJe do TJPE (que redirecionará para o SSO)
    const urlPje = 'https://pje.tjpe.jus.br/1g/login.seam';
    
    // Navegar para o site do PJe com timeout aumentado
    await page.goto(urlPje, { 
      timeout: 60000, 
      waitUntil: 'networkidle' 
    });
    
    console.log('Verificando se o formulário de login está presente...');
    // Aguardar até que o formulário de login esteja disponível
    await page.waitForSelector('#username', { timeout: 30000 });
    
    // Tirar screenshot da página de login
    await page.screenshot({ path: './tjpe-final-login-page.png' });
    
    console.log('Preenchendo credenciais...');
    // Preencher formulário de login do TJPE
    await page.fill('#username', credenciais.usuario);
    await page.fill('#password', credenciais.senha);
    
    // Tirar screenshot antes de clicar no botão de login
    await page.screenshot({ path: './tjpe-final-antes-login.png' });
    
    console.log('Clicando no botão de login...');
    // Clicar no botão de login
    await Promise.all([
      // Esperar pelo evento de navegação que ocorre após o clique
      page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle' }),
      // Clicar no botão
      page.click('#kc-login')
    ]);
    
    console.log('Verificando resultado do login...');
    
    // Verificar se estamos na página correta após o login
    const url = page.url();
    console.log(`URL após login: ${url}`);
    
    // Tirar screenshot após o login
    await page.screenshot({ path: './tjpe-final-apos-login.png' });
    
    // Verificar se há algum elemento que indique erro de login
    const erroLogin = await page.$('.alert-error, .alert-danger, .error-message');
    if (erroLogin) {
      const mensagemErro = await erroLogin.textContent();
      return { sucesso: false, erro: `Erro de login: ${mensagemErro || 'Credenciais inválidas'}` };
    }
    
    // Verificar se estamos em uma página válida após o login
    if (url.includes('pje') && url.includes('tjpe.jus.br')) {
      console.log('Login realizado com sucesso!');
      
      // Navegar para a página de consulta de processos
      console.log('Navegando para a página de consulta de processos...');
      await page.goto('https://pje.tjpe.jus.br/1g/Processo/ConsultaProcesso/listView.seam', {
        timeout: 60000,
        waitUntil: 'networkidle'
      });
      
      // Tirar screenshot da página de consulta
      await page.screenshot({ path: './tjpe-final-pagina-consulta.png' });
      
      return { sucesso: true };
    } else {
      console.log('Redirecionamento após login não ocorreu como esperado');
      return { sucesso: false, erro: 'Redirecionamento após login não ocorreu como esperado' };
    }
  } catch (error) {
    console.error('Erro durante o login:', error);
    return { 
      sucesso: false, 
      erro: error.message || 'Erro desconhecido durante o login'
    };
  }
}

async function testarLoginTJPE() {
  console.log('Iniciando teste de login no TJPE (versão final)...');
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-dev-shm-usage'],
    timeout: 60000,
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      ignoreHTTPSErrors: true
    });
    
    const page = await context.newPage();
    
    // Realizar login
    console.log('Realizando login no TJPE...');
    const loginResult = await realizarLoginTJPE(page, credenciais);
    
    // Exibir o resultado
    console.log('\n===== RESULTADO DO LOGIN =====');
    console.log(`Sucesso: ${loginResult.sucesso}`);
    
    if (!loginResult.sucesso) {
      console.log(`Erro: ${loginResult.erro}`);
    } else {
      console.log('Login realizado com sucesso!');
      
      // Aguardar para visualização manual
      console.log('\nAguardando 1 minuto para visualização manual...');
      console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
      console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
    
    console.log('\n===== FIM DO RESULTADO =====');
    console.log('Teste concluído com sucesso!');
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
