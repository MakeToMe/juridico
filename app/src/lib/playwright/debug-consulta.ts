/**
 * Script de debug para identificar e resolver o problema do botão de consulta
 */

import { chromium, Browser, Page } from 'playwright';

// Número do processo a ser consultado
const NUMERO_PROCESSO = '0727108-89.2024.8.02.0001';

async function debugConsultaProcesso() {
  console.log(`Iniciando debug da consulta do processo ${NUMERO_PROCESSO}...`);
  
  let browser: Browser | null = null;
  
  try {
    // Iniciar o navegador em modo visível para depuração
    browser = await chromium.launch({
      headless: false,
      args: ['--disable-dev-shm-usage'],
      timeout: 60000,
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    });
    
    // Ativar logs de console da página
    context.on('console', msg => {
      console.log(`[Página] ${msg.type()}: ${msg.text()}`);
    });
    
    const page = await context.newPage();
    
    // Navegar para a página de consulta
    console.log('Navegando para a página de consulta...');
    await page.goto('https://www2.tjal.jus.br/cpopg/search.do', { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    // Verificar se a página carregou corretamente
    console.log('Verificando se a página carregou corretamente...');
    const title = await page.title();
    console.log(`Título da página: ${title}`);
    
    // Verificar formulário e campos
    console.log('Verificando elementos do formulário...');
    await verificarElementos(page);
    
    // Preencher o formulário
    console.log('Preenchendo o formulário...');
    await preencherFormulario(page, NUMERO_PROCESSO);
    
    // Verificar botão de consulta
    console.log('Verificando botão de consulta...');
    await verificarBotaoConsulta(page);
    
    // Tentar diferentes métodos para clicar no botão
    console.log('Tentando diferentes métodos para clicar no botão...');
    await tentarClicarBotao(page);
    
    // Aguardar para verificar o resultado
    console.log('Aguardando 30 segundos para verificação manual...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('Erro durante o debug:', error);
  } finally {
    // Fechar o navegador
    if (browser) {
      console.log('Fechando o navegador...');
      await browser.close();
      console.log('Navegador fechado com sucesso!');
    }
  }
}

/**
 * Verifica os elementos presentes na página
 */
async function verificarElementos(page: Page) {
  // Verificar se o formulário existe
  const form = await page.$('form');
  console.log(`Formulário encontrado: ${!!form}`);
  
  if (form) {
    const formId = await form.getAttribute('id');
    const formAction = await form.getAttribute('action');
    console.log(`ID do formulário: ${formId}, Action: ${formAction}`);
  }
  
  // Verificar campos do processo
  const campoNumero = await page.$('input[name="numeroDigitoAnoUnificado"]');
  console.log(`Campo número processo encontrado: ${!!campoNumero}`);
  
  const campoForo = await page.$('input[name="foroNumeroUnificado"]');
  console.log(`Campo foro encontrado: ${!!campoForo}`);
  
  // Verificar botões
  const botoes = await page.$$('input[type="submit"]');
  console.log(`Número de botões submit encontrados: ${botoes.length}`);
  
  // Listar todos os botões
  for (let i = 0; i < botoes.length; i++) {
    const value = await botoes[i].getAttribute('value');
    const id = await botoes[i].getAttribute('id');
    const name = await botoes[i].getAttribute('name');
    console.log(`Botão ${i+1}: value="${value}", id="${id}", name="${name}"`);
  }
}

/**
 * Preenche o formulário com o número do processo
 */
async function preencherFormulario(page: Page, numeroProcesso: string) {
  // Extrair as partes do número do processo
  const parteInicial = numeroProcesso.substring(0, 13); // NNNNNNN-DD.AAAA
  const parteFinal = numeroProcesso.substring(16);      // OOOO (número do foro)
  
  console.log(`Preenchendo: parte inicial="${parteInicial}", parte final="${parteFinal}"`);
  
  // Tentar diferentes métodos de preenchimento
  
  // Método 1: usando fill
  try {
    await page.fill('input[name="numeroDigitoAnoUnificado"]', parteInicial);
    await page.fill('input[name="foroNumeroUnificado"]', parteFinal);
    console.log('Método 1 (fill) executado com sucesso');
  } catch (error) {
    console.error('Erro no método 1 (fill):', error);
  }
  
  // Método 2: usando type
  try {
    await page.type('input[name="numeroDigitoAnoUnificado"]', parteInicial, { delay: 50 });
    await page.type('input[name="foroNumeroUnificado"]', parteFinal, { delay: 50 });
    console.log('Método 2 (type) executado com sucesso');
  } catch (error) {
    console.error('Erro no método 2 (type):', error);
  }
  
  // Método 3: usando JavaScript
  try {
    await page.evaluate((parte1, parte2) => {
      const campoNumero = document.querySelector('input[name="numeroDigitoAnoUnificado"]') as HTMLInputElement;
      const campoForo = document.querySelector('input[name="foroNumeroUnificado"]') as HTMLInputElement;
      
      if (campoNumero) campoNumero.value = parte1;
      if (campoForo) campoForo.value = parte2;
      
      // Garantir que o radio button "Unificado" esteja selecionado
      const radioUnificado = document.querySelector('input[type="radio"][name="tipoCriterioUnificado"][value="U"]') as HTMLInputElement;
      if (radioUnificado) radioUnificado.checked = true;
    }, parteInicial, parteFinal);
    console.log('Método 3 (evaluate) executado com sucesso');
  } catch (error) {
    console.error('Erro no método 3 (evaluate):', error);
  }
  
  // Verificar o que foi preenchido
  const valorCampoNumero = await page.inputValue('input[name="numeroDigitoAnoUnificado"]');
  const valorCampoForo = await page.inputValue('input[name="foroNumeroUnificado"]');
  console.log(`Valores preenchidos: parte inicial="${valorCampoNumero}", parte final="${valorCampoForo}"`);
  
  // Tirar screenshot do formulário preenchido
  await page.screenshot({ path: './debug-form-preenchido.png' });
  console.log('Screenshot do formulário preenchido salvo');
}

/**
 * Verifica detalhes do botão de consulta
 */
async function verificarBotaoConsulta(page: Page) {
  // Verificar diferentes seletores possíveis
  const seletores = [
    '#pbConsultar',
    'input[type="submit"][value="Consultar"]',
    'input[name="pbConsultar"]',
    'input[id="pbConsultar"]',
    'input[type="submit"]'
  ];
  
  for (const seletor of seletores) {
    const elemento = await page.$(seletor);
    console.log(`Seletor "${seletor}": ${elemento ? 'encontrado' : 'não encontrado'}`);
    
    if (elemento) {
      const value = await elemento.getAttribute('value');
      const id = await elemento.getAttribute('id');
      const name = await elemento.getAttribute('name');
      const isVisible = await elemento.isVisible();
      const isEnabled = await elemento.isEnabled();
      
      console.log(`  Detalhes: value="${value}", id="${id}", name="${name}"`);
      console.log(`  Estado: visível=${isVisible}, habilitado=${isEnabled}`);
      
      // Verificar se está dentro de algum iframe
      const frameCount = page.frames().length;
      console.log(`  Número de frames na página: ${frameCount}`);
      
      // Destacar o elemento visualmente
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) {
          el.style.border = '3px solid red';
        }
      }, seletor);
    }
  }
}

/**
 * Tenta diferentes métodos para clicar no botão
 */
async function tentarClicarBotao(page: Page) {
  // Método 1: click direto com seletor exato
  try {
    console.log('Método 1: Tentando click com seletor exato...');
    const botaoConsultar = await page.$('input[type="submit"][value="Consultar"]');
    
    if (botaoConsultar) {
      // Rolar até o botão para garantir que está visível
      await botaoConsultar.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      
      // Tirar screenshot antes do clique
      await page.screenshot({ path: './debug-antes-clique.png' });
      
      // Clicar no botão e aguardar navegação
      await Promise.all([
        page.waitForNavigation({ timeout: 30000 }).catch(e => console.log('Timeout na navegação:', e.message)),
        botaoConsultar.click({ force: true })
      ]);
      
      console.log('Método 1: Click realizado');
      await page.screenshot({ path: './debug-depois-clique-1.png' });
      return; // Se funcionou, não precisa tentar outros métodos
    } else {
      console.log('Método 1: Botão não encontrado');
    }
  } catch (error) {
    console.error('Erro no método 1:', error);
  }
  
  // Método 2: usando JavaScript para clicar
  try {
    console.log('Método 2: Tentando click via JavaScript...');
    const clicou = await page.evaluate(() => {
      const botoes = document.querySelectorAll('input[type="submit"]');
      const botaoConsultar = Array.from(botoes).find(b => b.value === 'Consultar');
      
      if (botaoConsultar) {
        botaoConsultar.click();
        return true;
      }
      return false;
    });
    
    if (clicou) {
      console.log('Método 2: Click realizado via JavaScript');
      await page.waitForNavigation({ timeout: 30000 }).catch(e => console.log('Timeout na navegação:', e.message));
      await page.screenshot({ path: './debug-depois-clique-2.png' });
      return;
    } else {
      console.log('Método 2: Botão não encontrado via JavaScript');
    }
  } catch (error) {
    console.error('Erro no método 2:', error);
  }
  
  // Método 3: submeter o formulário diretamente
  try {
    console.log('Método 3: Tentando submeter o formulário diretamente...');
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) {
        form.submit();
        return true;
      }
      return false;
    });
    
    console.log('Método 3: Formulário submetido diretamente');
    await page.waitForNavigation({ timeout: 30000 }).catch(e => console.log('Timeout na navegação:', e.message));
    await page.screenshot({ path: './debug-depois-clique-3.png' });
  } catch (error) {
    console.error('Erro no método 3:', error);
  }
}

// Executar o debug
debugConsultaProcesso();
