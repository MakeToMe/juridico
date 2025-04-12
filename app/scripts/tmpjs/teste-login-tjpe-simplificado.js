/**
 * Script de teste para verificar o login no sistema PJe do TJPE
 * Usando uma abordagem simplificada com URL direta
 */

const { chromium, firefox } = require('playwright');

// Credenciais para acesso ao TJPE
const credenciais = {
  // URL simplificada, sem parâmetros de sessão
  site: 'https://sso.cloud.pje.jus.br/auth/realms/pje/protocol/openid-connect/auth?client_id=pje-tjpe-1g-cloud&redirect_uri=https%3A%2F%2Fpje.cloud.tjpe.jus.br%2F1g%2Flogin.seam&response_type=code&scope=openid',
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
    await page.goto(credenciais.site, { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    console.log('Verificando se o formulário de login está presente...');
    // Aguardar até que o formulário de login esteja disponível
    await page.waitForSelector('#username', { timeout: 30000 });
    
    console.log('Preenchendo credenciais...');
    // Preencher formulário de login do TJPE
    await page.fill('#username', credenciais.usuario);
    await page.fill('#password', credenciais.senha);
    
    // Tirar screenshot antes de clicar no botão de login
    await page.screenshot({ path: './tjpe-simples-antes-login.png' });
    
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
    await page.screenshot({ path: './tjpe-simples-depois-login.png' });
    
    // Verificar se há algum elemento que indique erro de login
    const erroLogin = await page.$('.alert-error, .alert-danger, .error-message');
    if (erroLogin) {
      const mensagemErro = await erroLogin.textContent();
      return { sucesso: false, erro: `Erro de login: ${mensagemErro || 'Credenciais inválidas'}` };
    }
    
    // Verificar se estamos em uma página válida após o login
    if (url.includes('pje.cloud.tjpe.jus.br')) {
      console.log('Login realizado com sucesso!');
      
      // Tentar navegar para a página principal após o login
      console.log('Navegando para a página principal...');
      await page.goto('https://pje.cloud.tjpe.jus.br/1g/Processo/ConsultaProcesso/listView.seam', {
        timeout: 60000,
        waitUntil: 'networkidle'
      });
      
      // Tirar screenshot da página principal
      await page.screenshot({ path: './tjpe-simples-pagina-principal.png' });
      
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
  console.log('Iniciando teste de login no TJPE (abordagem simplificada)...');
  
  // Testar com ambos os navegadores
  const browsers = [
    { name: 'Chromium', launch: chromium.launch },
    { name: 'Firefox', launch: firefox.launch }
  ];
  
  for (const browserInfo of browsers) {
    console.log(`\n=== Testando com ${browserInfo.name} ===`);
    
    const browser = await browserInfo.launch({
      headless: false,
      args: ['--disable-dev-shm-usage'],
      timeout: 60000,
    });
    
    try {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        // Configurações adicionais para evitar problemas de sessão
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
      });
      
      const page = await context.newPage();
      
      // Realizar login
      console.log(`Realizando login no TJPE com ${browserInfo.name}...`);
      const loginResult = await realizarLoginTJPE(page, credenciais);
      
      // Exibir o resultado
      console.log(`\n===== RESULTADO DO LOGIN (${browserInfo.name}) =====`);
      console.log(`Sucesso: ${loginResult.sucesso}`);
      
      if (!loginResult.sucesso) {
        console.log(`Erro: ${loginResult.erro}`);
      } else {
        console.log(`Login realizado com sucesso no ${browserInfo.name}!`);
        
        // Aguardar para visualização manual
        console.log(`\nAguardando 30 segundos para visualização manual no ${browserInfo.name}...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
      
      console.log(`\n===== FIM DO RESULTADO (${browserInfo.name}) =====`);
    } catch (error) {
      console.error(`Erro durante o teste com ${browserInfo.name}:`, error);
    } finally {
      // Garantir que o navegador seja fechado
      console.log(`Fechando ${browserInfo.name}...`);
      await browser.close();
      console.log(`${browserInfo.name} fechado com sucesso!`);
    }
  }
  
  console.log('\nTeste concluído para todos os navegadores!');
}

// Executar o teste
testarLoginTJPE();
