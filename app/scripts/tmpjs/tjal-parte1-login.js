/**
 * Script parte 1: Apenas fazer login no TJAL
 */

const { chromium } = require('playwright');
const fs = require('fs');

// Credenciais para acesso ao TJAL
const credenciais = {
  site: 'https://www2.tjal.jus.br/sajcas/login?service=https%3A%2F%2Fwww2.tjal.jus.br%2Fesaj%2Fj_spring_cas_security_check',
  usuario: '84769858434',
  senha: '8476guardia'
};

/**
 * Função para fazer login no TJAL
 */
async function loginTJAL() {
  console.log('Iniciando login no TJAL...');
  
  const browser = await chromium.launch({
    headless: false,  // Modo não-headless para visualização
    slowMo: 100  // Adicionar um pequeno atraso para visualização
  });
  
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });
  
  const page = await context.newPage();
  
  try {
    // Navegar para a página de login
    console.log('Navegando para a página de login...');
    await page.goto(credenciais.site);
    
    // Aguardar que a página de login carregue completamente
    await page.waitForSelector('#usernameForm');
    
    // Preencher credenciais
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', credenciais.usuario);
    await page.fill('#passwordForm', credenciais.senha);
    
    // Tirar screenshot antes de clicar no botão de login
    await page.screenshot({ path: 'antes-login.png' });
    
    // Clicar no botão de login
    console.log('Clicando no botão de login...');
    await page.click('#pbEntrar');
    
    // Aguardar um pouco para o login processar
    console.log('Aguardando processamento do login (5 segundos)...');
    await page.waitForTimeout(5000);
    
    // Verificar URL após login
    const urlAposLogin = page.url();
    console.log(`URL após login: ${urlAposLogin}`);
    
    // Tirar screenshot após login
    await page.screenshot({ path: 'apos-login.png' });
    
    // Aguardar para visualização manual
    console.log('\nAguardando 180 segundos (3 minutos) para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    
    await page.waitForTimeout(180000); // 3 minutos
    
  } catch (error) {
    console.error('Erro durante o login:', error);
    
    // Tirar screenshot em caso de erro
    try {
      await page.screenshot({ path: 'erro-login.png', fullPage: true });
      console.log('Screenshot do erro salvo como erro-login.png');
    } catch (screenshotError) {
      console.error('Erro ao tirar screenshot:', screenshotError);
    }
  } finally {
    // Fechar o navegador
    await browser.close();
    console.log('Navegador fechado.');
  }
}

// Executar o login
loginTJAL()
  .then(() => console.log('Script de login concluído com sucesso!'))
  .catch(error => console.error('Erro na execução do script de login:', error));
