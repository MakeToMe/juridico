/**
 * Script para login no TJPE acessando primeiro o portal e obtendo a URL assinada
 */

const { chromium } = require('playwright');

// Credenciais para acesso ao TJPE
const credenciais = {
  usuario: '84769858434',
  senha: '8476guardia'
};

async function testarLoginTJPE() {
  console.log('Iniciando teste de login no TJPE via portal...');
  
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
    
    // ETAPA 1: Acessar o portal do TJPE
    console.log('\n=== ETAPA 1: ACESSANDO O PORTAL DO TJPE ===');
    
    console.log('Navegando para a página inicial do portal...');
    await page.goto('https://portal.tjpe.jus.br/web/processo-judicial-eletronico', { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    // Tirar screenshot da página inicial
    await page.screenshot({ path: './tjpe-portal-inicial.png' });
    console.log('Screenshot da página inicial salvo');
    
    // Verificar se há um modal de cookies e aceitá-lo se necessário
    const aceitarCookiesButton = await page.$('button:has-text("Aceitar")');
    if (aceitarCookiesButton) {
      console.log('Aceitando cookies...');
      await aceitarCookiesButton.click();
      await page.waitForTimeout(1000);
    }
    
    // ETAPA 2: Encontrar e clicar no link para acessar o sistema
    console.log('\n=== ETAPA 2: ENCONTRANDO LINK DE ACESSO AO SISTEMA ===');
    
    // Procurar pelo link "ACESSAR O SISTEMA"
    console.log('Procurando pelo link de acesso ao sistema...');
    
    // Listar todos os links na página para debug
    const links = await page.$$('a');
    console.log(`Encontrados ${links.length} links na página`);
    
    for (let i = 0; i < Math.min(links.length, 20); i++) {
      const link = links[i];
      const text = await link.textContent();
      const href = await link.getAttribute('href');
      console.log(`Link ${i+1}: texto="${text?.trim()}", href="${href}"`);
    }
    
    // Tentar diferentes seletores para encontrar o link de acesso
    const seletoresAcesso = [
      'a:has-text("ACESSAR O SISTEMA")',
      'a.link-item:has-text("ACESSAR")',
      'a[href*="pje.cloud.tjpe.jus.br"]',
      'a[href*="sso.cloud.pje.jus.br"]',
      'a:has-text("Acessar")',
      'a:has-text("PJe")'
    ];
    
    let linkAcesso = null;
    for (const seletor of seletoresAcesso) {
      console.log(`Tentando seletor: ${seletor}`);
      linkAcesso = await page.$(seletor);
      if (linkAcesso) {
        const texto = await linkAcesso.textContent();
        console.log(`Link encontrado com seletor "${seletor}": ${texto?.trim()}`);
        break;
      }
    }
    
    if (!linkAcesso) {
      throw new Error('Não foi possível encontrar o link de acesso ao sistema');
    }
    
    // Obter a URL do link antes de clicar
    const urlAcesso = await linkAcesso.getAttribute('href');
    console.log(`URL de acesso encontrada: ${urlAcesso}`);
    
    // Destacar o link visualmente para debug
    await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (element) {
        element.style.border = '3px solid red';
      }
    }, seletoresAcesso.find(s => page.$(s)));
    
    // Tirar screenshot com o link destacado
    await page.screenshot({ path: './tjpe-portal-link-destacado.png' });
    
    // ETAPA 3: Clicar no link e navegar para a página de login
    console.log('\n=== ETAPA 3: NAVEGANDO PARA A PÁGINA DE LOGIN ===');
    
    console.log('Clicando no link de acesso...');
    
    // Usar Promise.all para aguardar a navegação após o clique
    await Promise.all([
      page.waitForNavigation({ timeout: 60000 }),
      linkAcesso.click()
    ]);
    
    // Verificar a URL após clicar no link
    const urlAposClique = page.url();
    console.log(`URL após clicar no link: ${urlAposClique}`);
    
    // Tirar screenshot da página de login
    await page.screenshot({ path: './tjpe-pagina-login.png' });
    
    // ETAPA 4: Realizar o login
    console.log('\n=== ETAPA 4: REALIZANDO LOGIN ===');
    
    // Aguardar o formulário de login
    console.log('Aguardando o formulário de login...');
    await page.waitForSelector('#username', { timeout: 30000 });
    
    // Preencher credenciais
    console.log('Preenchendo credenciais...');
    await page.fill('#username', credenciais.usuario);
    await page.fill('#password', credenciais.senha);
    
    // Tirar screenshot antes de clicar no botão de login
    await page.screenshot({ path: './tjpe-antes-login.png' });
    
    // Clicar no botão de login
    console.log('Clicando no botão de login...');
    await Promise.all([
      page.waitForNavigation({ timeout: 60000 }),
      page.click('#kc-login')
    ]);
    
    // Verificar resultado do login
    const urlAposLogin = page.url();
    console.log(`URL após login: ${urlAposLogin}`);
    
    // Tirar screenshot após o login
    await page.screenshot({ path: './tjpe-apos-login.png' });
    
    // Verificar se há mensagem de erro
    const erroLogin = await page.$('.alert-error, .alert-danger, .error-message');
    if (erroLogin) {
      const mensagemErro = await erroLogin.textContent();
      console.log(`Erro de login: ${mensagemErro?.trim()}`);
      throw new Error(`Erro de login: ${mensagemErro?.trim() || 'Credenciais inválidas'}`);
    }
    
    // Verificar se o login foi bem-sucedido
    if (urlAposLogin.includes('pje.cloud.tjpe.jus.br')) {
      console.log('Login realizado com sucesso!');
      
      // Aguardar para visualização manual
      console.log('\nAguardando 1 minuto para visualização manual...');
      console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
      console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
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
