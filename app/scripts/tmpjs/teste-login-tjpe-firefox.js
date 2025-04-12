/**
 * Script de teste para verificar o login no sistema PJe do TJPE usando Firefox
 */

const { firefox } = require('playwright');

// Credenciais para acesso ao TJPE
const credenciais = {
  site: 'https://sso.cloud.pje.jus.br/auth/realms/pje/protocol/openid-connect/auth?response_type=code&client_id=pje-tjpe-1g-cloud&redirect_uri=https%3A%2F%2Fpje.cloud.tjpe.jus.br%2F1g%2Flogin.seam&state=343712ee-6903-45d6-a262-7e64eb0e7f08&login=true&scope=openid',
  usuario: '84769858434',
  senha: '8476guardia'
};

/**
 * Realiza o login no sistema PJe do TJPE
 */
async function realizarLoginTJPE(page, credenciais) {
  try {
    console.log('Navegando para a página de login do TJPE...');
    // Navegar para o site de login do TJPE com timeout aumentado
    await page.goto(credenciais.site, { timeout: 60000, waitUntil: 'networkidle' });
    
    console.log('Verificando se o formulário de login está presente...');
    // Aguardar até que o formulário de login esteja disponível
    await page.waitForSelector('#username', { timeout: 30000 });
    
    console.log('Preenchendo credenciais...');
    // Preencher formulário de login do TJPE
    await page.fill('#username', credenciais.usuario);
    await page.fill('#password', credenciais.senha);
    
    // Tirar screenshot antes de clicar no botão de login
    await page.screenshot({ path: './tjpe-firefox-antes-login.png' });
    
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
    await page.screenshot({ path: './tjpe-firefox-depois-login.png' });
    
    // Verificar se há algum elemento que indique erro de login
    const erroLogin = await page.$('.alert-error, .alert-danger, .error-message');
    if (erroLogin) {
      const mensagemErro = await erroLogin.textContent();
      return { sucesso: false, erro: `Erro de login: ${mensagemErro || 'Credenciais inválidas'}` };
    }
    
    // Verificar se estamos em uma página válida após o login
    if (url.includes('pje.cloud.tjpe.jus.br')) {
      console.log('Login realizado com sucesso!');
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
  console.log('Iniciando teste de login no TJPE usando Firefox...');
  
  const browser = await firefox.launch({
    headless: false,
    args: ['--disable-dev-shm-usage'],
    timeout: 60000,
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
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
      
      // Tirar screenshot da página após login bem-sucedido
      await page.screenshot({ path: './tjpe-firefox-logado.png' });
      
      // Aguardar para visualização manual
      console.log('\nAguardando 1 minuto para visualização manual...');
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
    
    console.log('\n===== FIM DO RESULTADO =====');
    console.log('Teste concluído com sucesso!');
  } catch (error) {
    console.error('Erro durante o teste:', error);
  } finally {
    // Garantir que o navegador seja fechado
    console.log('Fechando navegador...');
    await browser.close();
    console.log('Navegador fechado com sucesso!');
  }
}

// Executar o teste
testarLoginTJPE();
