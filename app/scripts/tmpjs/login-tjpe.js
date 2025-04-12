/**
 * Script para testar o login no sistema do TJPE (PJe)
 */

const { chromium } = require('playwright');

// Credenciais para acesso ao TJPE
const credenciais = {
  site: 'https://sso.cloud.pje.jus.br/auth/realms/pje/protocol/openid-connect/auth?response_type=code&client_id=pje-tjpe-1g-cloud&redirect_uri=https%3A%2F%2Fpje.cloud.tjpe.jus.br%2F1g%2Flogin.seam&state=343712ee-6903-45d6-a262-7e64eb0e7f08&login=true&scope=openid',
  usuario: '84769858434',
  senha: '8476guardia'
};

async function testarLoginTJPE() {
  console.log('Iniciando teste de login no TJPE...');
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-dev-shm-usage'],
    timeout: 60000,
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    });
    
    // Ativar logs de console da página
    context.on('console', msg => {
      console.log(`[Página] ${msg.type()}: ${msg.text()}`);
    });
    
    const page = await context.newPage();
    
    // ETAPA 1: NAVEGAR PARA A PÁGINA DE LOGIN
    console.log('\n=== ETAPA 1: NAVEGANDO PARA A PÁGINA DE LOGIN ===');
    
    console.log('Acessando a página de login do TJPE...');
    await page.goto(credenciais.site, { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    // Tirar screenshot da página de login
    await page.screenshot({ path: './tjpe-login-page.png' });
    console.log('Screenshot da página de login salvo como tjpe-login-page.png');
    
    // ETAPA 2: ANALISAR OS SELETORES DA PÁGINA
    console.log('\n=== ETAPA 2: ANALISANDO SELETORES DA PÁGINA ===');
    
    // Verificar os campos de input disponíveis
    const inputs = await page.$$('input');
    console.log(`Número de campos input encontrados: ${inputs.length}`);
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const id = await input.getAttribute('id');
      const name = await input.getAttribute('name');
      const type = await input.getAttribute('type');
      const placeholder = await input.getAttribute('placeholder');
      
      console.log(`Input ${i+1}: id="${id}", name="${name}", type="${type}", placeholder="${placeholder}"`);
    }
    
    // Verificar os botões disponíveis
    const buttons = await page.$$('button');
    console.log(`Número de botões encontrados: ${buttons.length}`);
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const id = await button.getAttribute('id');
      const type = await button.getAttribute('type');
      const text = await button.textContent();
      
      console.log(`Botão ${i+1}: id="${id}", type="${type}", texto="${text?.trim()}"`);
    }
    
    // ETAPA 3: TENTAR LOGIN
    console.log('\n=== ETAPA 3: TENTANDO LOGIN ===');
    
    // Verificar se os campos de login e senha estão visíveis
    const usernameInput = await page.$('input[name="username"]');
    const passwordInput = await page.$('input[name="password"]');
    const loginButton = await page.$('input[type="submit"], button[type="submit"]');
    
    if (!usernameInput) {
      console.log('Campo de usuário não encontrado!');
      // Tentar encontrar por outros seletores
      console.log('Tentando encontrar campo de usuário por outros seletores...');
      const possibleUsernames = await page.$$('input[type="text"]');
      console.log(`Encontrados ${possibleUsernames.length} campos de texto que podem ser o username`);
    }
    
    if (!passwordInput) {
      console.log('Campo de senha não encontrado!');
      // Tentar encontrar por outros seletores
      console.log('Tentando encontrar campo de senha por outros seletores...');
      const possiblePasswords = await page.$$('input[type="password"]');
      console.log(`Encontrados ${possiblePasswords.length} campos de senha`);
    }
    
    if (!loginButton) {
      console.log('Botão de login não encontrado!');
      // Tentar encontrar por outros seletores
      console.log('Tentando encontrar botão de login por outros seletores...');
      const possibleButtons = await page.$$('button, input[type="submit"]');
      console.log(`Encontrados ${possibleButtons.length} possíveis botões de login`);
    }
    
    // Preencher os campos de login e senha
    console.log('Preenchendo credenciais...');
    
    // Tentar diferentes seletores para o campo de usuário
    try {
      if (usernameInput) {
        await usernameInput.fill(credenciais.usuario);
        console.log('Campo de usuário preenchido com sucesso!');
      } else {
        // Tentar preencher o primeiro campo de texto encontrado
        await page.fill('input[type="text"]', credenciais.usuario);
        console.log('Campo de usuário preenchido usando seletor alternativo');
      }
    } catch (error) {
      console.error('Erro ao preencher o campo de usuário:', error);
    }
    
    // Tentar diferentes seletores para o campo de senha
    try {
      if (passwordInput) {
        await passwordInput.fill(credenciais.senha);
        console.log('Campo de senha preenchido com sucesso!');
      } else {
        // Tentar preencher o primeiro campo de senha encontrado
        await page.fill('input[type="password"]', credenciais.senha);
        console.log('Campo de senha preenchido usando seletor alternativo');
      }
    } catch (error) {
      console.error('Erro ao preencher o campo de senha:', error);
    }
    
    // Tirar screenshot após preencher os campos
    await page.screenshot({ path: './tjpe-login-preenchido.png' });
    console.log('Screenshot após preencher os campos salvo como tjpe-login-preenchido.png');
    
    // Clicar no botão de login
    console.log('Clicando no botão de login...');
    try {
      if (loginButton) {
        await Promise.all([
          page.waitForNavigation({ timeout: 60000 }).catch(e => console.log('Timeout na navegação:', e.message)),
          loginButton.click()
        ]);
        console.log('Botão de login clicado com sucesso!');
      } else {
        // Tentar clicar no botão de login usando diferentes seletores
        await Promise.all([
          page.waitForNavigation({ timeout: 60000 }).catch(e => console.log('Timeout na navegação:', e.message)),
          page.click('button[type="submit"], input[type="submit"], button:has-text("Entrar")')
        ]);
        console.log('Botão de login clicado usando seletor alternativo');
      }
    } catch (error) {
      console.error('Erro ao clicar no botão de login:', error);
    }
    
    // Verificar resultado do login
    console.log('Verificando resultado do login...');
    const currentUrl = page.url();
    console.log(`URL após tentativa de login: ${currentUrl}`);
    
    // Tirar screenshot após tentativa de login
    await page.screenshot({ path: './tjpe-apos-login.png' });
    console.log('Screenshot após tentativa de login salvo como tjpe-apos-login.png');
    
    // Verificar se há mensagem de erro
    const errorMessage = await page.$('.alert-error, .alert-danger, .error-message');
    if (errorMessage) {
      const errorText = await errorMessage.textContent();
      console.log(`Mensagem de erro encontrada: ${errorText.trim()}`);
    }
    
    // Verificar se o login foi bem-sucedido
    if (currentUrl.includes('pje.cloud.tjpe.jus.br') && !currentUrl.includes('auth')) {
      console.log('Login realizado com sucesso!');
    } else {
      console.log('Não foi possível confirmar se o login foi bem-sucedido.');
    }
    
    // Aguardar para visualização manual
    console.log('\nAguardando 2 minutos para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    await new Promise(resolve => setTimeout(resolve, 120000));
    
  } catch (error) {
    console.error('Erro durante o teste de login:', error);
  } finally {
    // Fechar o navegador
    console.log('Fechando o navegador...');
    await browser.close();
    console.log('Navegador fechado com sucesso!');
  }
}

// Executar o teste de login
testarLoginTJPE();
