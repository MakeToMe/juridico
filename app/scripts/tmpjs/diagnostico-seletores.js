/**
 * Script de diagnóstico para identificar os seletores corretos na página de consulta do TJAL
 */

const { chromium } = require('playwright');

async function diagnosticarSeletores() {
  console.log('Iniciando diagnóstico de seletores na página de consulta do TJAL...');
  
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
    
    // Navegar para a página de consulta
    console.log('Navegando para a página de consulta...');
    await page.goto('https://www2.tjal.jus.br/cpopg/search.do', { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    // Verificar o título da página
    const title = await page.title();
    console.log(`Título da página: ${title}`);
    
    // Tirar screenshot da página inicial
    await page.screenshot({ path: './diagnostico-pagina-inicial.png' });
    
    // Analisar o formulário
    console.log('\n=== ANÁLISE DO FORMULÁRIO ===');
    
    // Verificar o formulário
    const form = await page.$('form');
    if (form) {
      const formId = await form.getAttribute('id');
      const formName = await form.getAttribute('name');
      const formAction = await form.getAttribute('action');
      console.log(`Formulário: id="${formId}", name="${formName}", action="${formAction}"`);
    } else {
      console.log('Formulário não encontrado!');
    }
    
    // Verificar campos de entrada
    console.log('\n=== CAMPOS DE ENTRADA ===');
    const inputs = await page.$$('input');
    console.log(`Total de inputs na página: ${inputs.length}`);
    
    // Analisar cada input
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const type = await input.getAttribute('type');
      const id = await input.getAttribute('id');
      const name = await input.getAttribute('name');
      const value = await input.getAttribute('value');
      
      console.log(`Input ${i+1}: type="${type}", id="${id}", name="${name}", value="${value}"`);
      
      // Destacar o elemento
      await page.evaluate((idx) => {
        const inputs = document.querySelectorAll('input');
        if (inputs[idx]) {
          inputs[idx].style.border = '2px solid red';
        }
      }, i);
      
      // Tirar screenshot para cada input de radio ou submit
      if (type === 'radio' || type === 'submit') {
        await page.screenshot({ path: `./diagnostico-input-${i+1}-${type}.png` });
      }
    }
    
    // Verificar radio buttons específicos
    console.log('\n=== RADIO BUTTONS ===');
    const radioButtons = await page.$$('input[type="radio"]');
    console.log(`Total de radio buttons: ${radioButtons.length}`);
    
    // Verificar o radio button "Unificado"
    console.log('\n=== VERIFICANDO RADIO BUTTON "UNIFICADO" ===');
    const seletoresRadio = [
      'input[type="radio"][value="U"]',
      'input[type="radio"][name="tipoCriterioUnificado"][value="U"]',
      'input[value="U"]',
      '#radioNumeroUnificado'
    ];
    
    for (const seletor of seletoresRadio) {
      const radio = await page.$(seletor);
      console.log(`Seletor "${seletor}": ${radio ? 'encontrado' : 'não encontrado'}`);
      
      if (radio) {
        const checked = await radio.isChecked();
        const visible = await radio.isVisible();
        console.log(`  Estado: checked=${checked}, visible=${visible}`);
        
        // Destacar o elemento
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) {
            el.parentElement.style.border = '3px solid blue';
          }
        }, seletor);
        
        await page.screenshot({ path: `./diagnostico-radio-${seletor.replace(/[^\w]/g, '-')}.png` });
      }
    }
    
    // Verificar o botão de consulta
    console.log('\n=== VERIFICANDO BOTÃO DE CONSULTA ===');
    const seletoresBotao = [
      '#botaoConsultarProcessos',
      'input[type="submit"][value="Consultar"]',
      'input[value="Consultar"]'
    ];
    
    for (const seletor of seletoresBotao) {
      const botao = await page.$(seletor);
      console.log(`Seletor "${seletor}": ${botao ? 'encontrado' : 'não encontrado'}`);
      
      if (botao) {
        const visible = await botao.isVisible();
        const enabled = await botao.isEnabled();
        console.log(`  Estado: visible=${visible}, enabled=${enabled}`);
        
        // Destacar o elemento
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) {
            el.style.border = '3px solid green';
          }
        }, seletor);
        
        await page.screenshot({ path: `./diagnostico-botao-${seletor.replace(/[^\w]/g, '-')}.png` });
      }
    }
    
    // Extrair HTML do formulário para análise
    console.log('\n=== HTML DO FORMULÁRIO ===');
    const formHtml = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form ? form.outerHTML : 'Formulário não encontrado';
    });
    
    console.log(formHtml);
    
    // Aguardar para análise manual
    console.log('\nAguardando 30 segundos para análise manual...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('Erro durante o diagnóstico:', error);
  } finally {
    // Fechar o navegador
    console.log('Fechando o navegador...');
    await browser.close();
    console.log('Navegador fechado com sucesso!');
  }
}

// Executar o diagnóstico
diagnosticarSeletores();
