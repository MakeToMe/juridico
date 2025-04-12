/**
 * Script simplificado para consultar um processo no TJAL
 */

const { chromium } = require('playwright');

// Número do processo a ser consultado
const NUMERO_PROCESSO = '0727108-89.2024.8.02.0001';

async function consultarProcesso() {
  console.log(`Iniciando consulta do processo ${NUMERO_PROCESSO}...`);
  
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
    
    const page = await context.newPage();
    
    // Ir diretamente para a página de consulta
    console.log('Navegando para a página de consulta...');
    await page.goto('https://www2.tjal.jus.br/cpopg/search.do', { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    console.log('Preenchendo o formulário de consulta...');
    
    // Usar JavaScript para preencher os campos diretamente
    await page.evaluate(() => {
      // Preencher com os valores corretos
      document.querySelector('input[name="numeroDigitoAnoUnificado"]').value = '0727108-89.2024';
      document.querySelector('input[name="foroNumeroUnificado"]').value = '0001';
      
      // Garantir que o radio button "Unificado" esteja selecionado
      document.querySelector('input[type="radio"][name="tipoCriterioUnificado"][value="U"]').checked = true;
    });
    
    // Verificar o que foi preenchido
    const parte1 = await page.inputValue('input[name="numeroDigitoAnoUnificado"]');
    const parte2 = await page.inputValue('input[name="foroNumeroUnificado"]');
    console.log(`Valores preenchidos: ${parte1} e ${parte2}`);
    
    // Tirar screenshot antes de clicar
    await page.screenshot({ path: './antes-consulta.png' });
    console.log('Screenshot antes de clicar salvo como antes-consulta.png');
    
    // Clicar no botão de consultar usando JavaScript
    console.log('Tentando clicar no botão Consultar...');
    
    const clicou = await page.evaluate(() => {
      // Encontrar todos os botões de submit
      const botoes = document.querySelectorAll('input[type="submit"]');
      console.log(`Encontrados ${botoes.length} botões de submit`);
      
      // Mostrar informações sobre cada botão
      botoes.forEach((b, i) => {
        console.log(`Botão ${i}:`, b.value, b.id, b.className);
      });
      
      // Tentar clicar no botão Consultar
      const botaoConsultar = Array.from(botoes).find(b => b.value === 'Consultar');
      if (botaoConsultar) {
        console.log('Botão Consultar encontrado, clicando...');
        botaoConsultar.click();
        return true;
      }
      
      return false;
    });
    
    console.log('Resultado do clique:', clicou ? 'Sucesso' : 'Falha');
    
    if (!clicou) {
      console.log('Tentando submeter o formulário diretamente...');
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          form.submit();
        }
      });
    }
    
    // Aguardar a navegação após o clique
    console.log('Aguardando navegação após o clique...');
    try {
      await page.waitForNavigation({ timeout: 30000 });
      console.log('Navegação concluída após clicar em consultar');
      
      // Tirar screenshot após a navegação
      await page.screenshot({ path: './depois-consulta.png' });
      console.log('Screenshot após consulta salvo como depois-consulta.png');
      
      // Verificar se estamos na página de resultados
      const url = page.url();
      console.log(`URL após consulta: ${url}`);
      
      // Extrair informações básicas do processo, se disponíveis
      const dadosProcesso = await page.evaluate(() => {
        const numeroProcesso = document.querySelector('#numeroProcesso')?.textContent;
        const classe = document.querySelector('#classeProcesso')?.textContent;
        const assunto = document.querySelector('#assuntoProcesso')?.textContent;
        
        return { numeroProcesso, classe, assunto };
      });
      
      console.log('Dados do processo:', dadosProcesso);
    } catch (error) {
      console.log('Timeout na navegação:', error.message);
      
      // Tirar screenshot mesmo com erro
      await page.screenshot({ path: './erro-consulta.png' });
      console.log('Screenshot do erro salvo como erro-consulta.png');
    }
    
    // Aguardar 30 segundos para visualização manual
    console.log('Aguardando 30 segundos para visualização manual...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('Erro durante a consulta:', error);
  } finally {
    // Fechar o navegador
    console.log('Fechando o navegador...');
    await browser.close();
    console.log('Navegador fechado com sucesso!');
  }
}

// Executar a consulta
consultarProcesso();
