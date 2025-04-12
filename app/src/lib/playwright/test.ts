/**
 * Script de teste para verificar se o Playwright está funcionando corretamente
 */

import { chromium } from 'playwright';

async function testarPlaywright() {
  console.log('Iniciando teste do Playwright...');
  
  try {
    // Iniciar o navegador
    const browser = await chromium.launch({ headless: true });
    console.log('Navegador iniciado com sucesso!');
    
    // Criar uma nova página
    const page = await browser.newPage();
    console.log('Página criada com sucesso!');
    
    // Navegar para uma página de teste
    await page.goto('https://www.google.com');
    console.log('Navegação realizada com sucesso!');
    
    // Capturar o título da página
    const title = await page.title();
    console.log(`Título da página: ${title}`);
    
    // Fechar o navegador
    await browser.close();
    console.log('Navegador fechado com sucesso!');
    
    console.log('Teste concluído com sucesso!');
  } catch (error) {
    console.error('Erro durante o teste:', error);
  }
}

// Executar o teste
testarPlaywright();
