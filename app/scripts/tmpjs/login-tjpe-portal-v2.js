/**
 * Script para login no TJPE acessando primeiro o portal e obtendo a URL assinada
 * Versão 2 com abordagem mais robusta para encontrar o link
 */

const { chromium } = require('playwright');

// Credenciais para acesso ao TJPE
const credenciais = {
  usuario: '84769858434',
  senha: '8476guardia'
};

async function testarLoginTJPE() {
  console.log('Iniciando teste de login no TJPE via portal (v2)...');
  
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
    const aceitarCookiesButton = await page.$('button:text("Aceitar")');
    if (aceitarCookiesButton) {
      console.log('Aceitando cookies...');
      await aceitarCookiesButton.click();
      await page.waitForTimeout(1000);
    }
    
    // ETAPA 2: Encontrar e clicar no link para acessar o sistema
    console.log('\n=== ETAPA 2: ENCONTRANDO LINK DE ACESSO AO SISTEMA ===');
    
    // Usar JavaScript para encontrar o link com o texto "ACESSAR O SISTEMA"
    console.log('Procurando pelo link de acesso ao sistema usando JavaScript...');
    
    const linkInfo = await page.evaluate(() => {
      // Função para encontrar links que contenham o texto específico
      function findLinksByText(text) {
        const links = Array.from(document.querySelectorAll('a'));
        return links.filter(link => {
          const linkText = link.textContent.trim().toUpperCase();
          return linkText.includes(text);
        }).map(link => {
          return {
            text: link.textContent.trim(),
            href: link.href,
            id: link.id,
            className: link.className
          };
        });
      }
      
      // Procurar por links com diferentes textos relacionados ao acesso
      const acessarSistema = findLinksByText('ACESSAR O SISTEMA');
      const acessar = findLinksByText('ACESSAR');
      const pje = findLinksByText('PJE');
      
      // Retornar informações sobre os links encontrados
      return {
        acessarSistema,
        acessar,
        pje
      };
    });
    
    console.log('Links encontrados:');
    console.log('- ACESSAR O SISTEMA:', linkInfo.acessarSistema.length);
    console.log('- ACESSAR:', linkInfo.acessar.length);
    console.log('- PJE:', linkInfo.pje.length);
    
    // Exibir detalhes dos links encontrados
    if (linkInfo.acessarSistema.length > 0) {
      console.log('\nDetalhes dos links "ACESSAR O SISTEMA":');
      linkInfo.acessarSistema.forEach((link, i) => {
        console.log(`Link ${i+1}: texto="${link.text}", href="${link.href}"`);
      });
    }
    
    if (linkInfo.acessar.length > 0) {
      console.log('\nDetalhes dos links "ACESSAR":');
      linkInfo.acessar.forEach((link, i) => {
        console.log(`Link ${i+1}: texto="${link.text}", href="${link.href}"`);
      });
    }
    
    // Tentar clicar diretamente no link para o PJe
    console.log('\nTentando acessar diretamente a URL do PJe...');
    
    // URL direta para o PJe do TJPE
    const urlPje = 'https://pje.tjpe.jus.br/1g/login.seam';
    console.log(`Navegando para: ${urlPje}`);
    
    await page.goto(urlPje, { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    // Verificar se fomos redirecionados para a página de login do SSO
    const urlAtual = page.url();
    console.log(`URL atual: ${urlAtual}`);
    
    // Tirar screenshot da página atual
    await page.screenshot({ path: './tjpe-pagina-redirecionada.png' });
    
    // Verificar se estamos na página de login do SSO
    const estamosNaPaginaLogin = urlAtual.includes('sso.cloud.pje.jus.br') && await page.$('#username');
    
    if (!estamosNaPaginaLogin) {
      console.log('Não fomos redirecionados para a página de login. Tentando outra abordagem...');
      
      // Voltar para a página do portal
      await page.goto('https://portal.tjpe.jus.br/web/processo-judicial-eletronico', { 
        timeout: 60000,
        waitUntil: 'networkidle'
      });
      
      // Tentar clicar no link usando um seletor mais genérico
      console.log('Tentando clicar em links que possam levar ao sistema...');
      
      // Encontrar todos os links que possam ser relevantes
      const linksRelevantes = await page.$$('a[href*="pje"], a[href*="tjpe"], a[href*="judicial"]');
      console.log(`Encontrados ${linksRelevantes.length} links potencialmente relevantes`);
      
      // Exibir informações sobre os links
      for (let i = 0; i < Math.min(linksRelevantes.length, 10); i++) {
        const link = linksRelevantes[i];
        const texto = await link.textContent();
        const href = await link.getAttribute('href');
        console.log(`Link ${i+1}: texto="${texto?.trim()}", href="${href}"`);
      }
      
      // Tentar clicar no primeiro link que parece ser o de acesso ao sistema
      if (linksRelevantes.length > 0) {
        console.log('Tentando clicar no primeiro link relevante...');
        await Promise.all([
          page.waitForNavigation({ timeout: 60000 }).catch(e => console.log('Timeout na navegação:', e.message)),
          linksRelevantes[0].click()
        ]);
        
        // Verificar a URL após o clique
        const urlAposClique = page.url();
        console.log(`URL após clicar no link: ${urlAposClique}`);
        
        // Tirar screenshot da página atual
        await page.screenshot({ path: './tjpe-apos-clique-link.png' });
      }
    }
    
    // ETAPA 3: Realizar o login (se estivermos na página de login)
    console.log('\n=== ETAPA 3: REALIZANDO LOGIN ===');
    
    // Verificar se estamos na página de login
    const usernameField = await page.$('#username');
    
    if (usernameField) {
      console.log('Página de login detectada. Preenchendo credenciais...');
      
      // Preencher credenciais
      await page.fill('#username', credenciais.usuario);
      await page.fill('#password', credenciais.senha);
      
      // Tirar screenshot antes de clicar no botão de login
      await page.screenshot({ path: './tjpe-antes-login.png' });
      
      // Clicar no botão de login
      console.log('Clicando no botão de login...');
      await Promise.all([
        page.waitForNavigation({ timeout: 60000 }).catch(e => console.log('Timeout na navegação:', e.message)),
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
      } else if (urlAposLogin.includes('pje.cloud.tjpe.jus.br')) {
        console.log('Login realizado com sucesso!');
      } else {
        console.log('Não foi possível confirmar se o login foi bem-sucedido.');
      }
    } else {
      console.log('Não estamos na página de login. Verificando a página atual...');
      
      // Verificar se já estamos logados
      const urlAtual = page.url();
      if (urlAtual.includes('pje.cloud.tjpe.jus.br') || urlAtual.includes('pje.tjpe.jus.br')) {
        console.log('Parece que já estamos em uma página do sistema PJe.');
        
        // Verificar se há elementos que indiquem que estamos logados
        const elementosLogado = await page.$$('a:has-text("Sair"), .usuario-logado, .user-info');
        if (elementosLogado.length > 0) {
          console.log('Detectados elementos que indicam que estamos logados!');
        }
      }
    }
    
    // Aguardar para visualização manual
    console.log('\nAguardando 1 minuto para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
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
