/**
 * Script corrigido para consultar um processo no TJAL
 * Corrige o problema de preenchimento dos campos do número do processo
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
    
    // Extrair as partes do número do processo corretamente
    // Formato: NNNNNNN-DD.AAAA.J.TR.OOOO
    // Exemplo: 0727108-89.2024.8.02.0001
    
    // Primeira parte: NNNNNNN-DD.AAAA (0727108-89.2024)
    const partePrimeiroCampo = NUMERO_PROCESSO.substring(0, 15);
    
    // Última parte: OOOO (0001)
    const parteTerceiroCampo = NUMERO_PROCESSO.substring(21);
    
    console.log(`Preenchendo campos: Primeiro="${partePrimeiroCampo}", Terceiro="${parteTerceiroCampo}"`);
    
    // Preencher os campos usando o método fill para garantir que o valor seja inserido corretamente
    await page.fill('#numeroDigitoAnoUnificado', partePrimeiroCampo);
    await page.fill('#foroNumeroUnificado', parteTerceiroCampo);
    
    // Garantir que o radio button "Unificado" esteja selecionado
    await page.check('input[type="radio"][name="tipoCriterioUnificado"][value="U"]');
    
    // Verificar o que foi preenchido
    const valorCampo1 = await page.inputValue('#numeroDigitoAnoUnificado');
    const valorCampo2 = await page.inputValue('#foroNumeroUnificado');
    console.log(`Valores preenchidos: Campo 1="${valorCampo1}", Campo 2="${valorCampo2}"`);
    
    // Tirar screenshot antes de clicar
    await page.screenshot({ path: './antes-consulta-corrigido.png' });
    console.log('Screenshot antes de clicar salvo');
    
    // Clicar no botão de consultar usando o seletor correto
    console.log('Clicando no botão Consultar...');
    
    // Usar Promise.all para aguardar a navegação após o clique
    await Promise.all([
      page.waitForNavigation({ timeout: 30000 }),
      page.click('#botaoConsultarProcessos')
    ]);
    
    console.log('Navegação concluída após clicar em consultar');
    
    // Tirar screenshot após a navegação
    await page.screenshot({ path: './depois-consulta-corrigido.png' });
    console.log('Screenshot após consulta salvo');
    
    // Verificar se estamos na página de resultados
    const url = page.url();
    console.log(`URL após consulta: ${url}`);
    
    // Extrair informações básicas do processo, se disponíveis
    const dadosProcesso = await page.evaluate(() => {
      const numeroProcesso = document.querySelector('.espacamentoLinhas')?.textContent;
      const classe = document.querySelector('span[id*="classeProcesso"]')?.textContent;
      const assunto = document.querySelector('span[id*="assuntoProcesso"]')?.textContent;
      
      return { numeroProcesso, classe, assunto };
    });
    
    console.log('Dados do processo:', dadosProcesso);
    
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
