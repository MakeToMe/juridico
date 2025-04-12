/**
 * Script de diagnóstico para identificar os seletores do formulário de consulta de processos no TJPE
 */

const { chromium } = require('playwright');

// Credenciais para acesso ao TJPE
const credenciais = {
  usuario: '84769858434',
  senha: '8476guardia'
};

// Número de processo para teste
const NUMERO_PROCESSO = '0000001-12.2023.8.17.0001'; // Exemplo - substitua por um número válido

async function diagnosticarConsultaTJPE() {
  console.log('Iniciando diagnóstico da consulta de processos no TJPE...');
  
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
    
    // Ativar logs de console da página
    context.on('console', msg => {
      console.log(`[Página] ${msg.type()}: ${msg.text()}`);
    });
    
    const page = await context.newPage();
    
    // ETAPA 1: LOGIN NO SISTEMA
    console.log('\n=== ETAPA 1: REALIZANDO LOGIN NO SISTEMA ===');
    
    // URL direta para o PJe do TJPE
    const urlPje = 'https://pje.tjpe.jus.br/1g/login.seam';
    
    console.log('Navegando para a página de login...');
    await page.goto(urlPje, { 
      timeout: 60000, 
      waitUntil: 'networkidle' 
    });
    
    console.log('Verificando se o formulário de login está presente...');
    await page.waitForSelector('#username', { timeout: 30000 });
    
    console.log('Preenchendo credenciais...');
    await page.fill('#username', credenciais.usuario);
    await page.fill('#password', credenciais.senha);
    
    console.log('Clicando no botão de login...');
    await Promise.all([
      page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle' }),
      page.click('#kc-login')
    ]);
    
    // Verificar se o login foi bem-sucedido
    const urlAposLogin = page.url();
    console.log(`URL após login: ${urlAposLogin}`);
    
    if (!urlAposLogin.includes('pje') || !urlAposLogin.includes('tjpe.jus.br')) {
      throw new Error('Login não foi bem-sucedido');
    }
    
    console.log('Login realizado com sucesso!');
    
    // ETAPA 2: NAVEGAR PARA A PÁGINA DE CONSULTA
    console.log('\n=== ETAPA 2: NAVEGANDO PARA A PÁGINA DE CONSULTA ===');
    
    console.log('Navegando para a página de consulta de processos...');
    await page.goto('https://pje.cloud.tjpe.jus.br/1g/Processo/ConsultaProcesso/listView.seam', {
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    // Tirar screenshot da página de consulta
    await page.screenshot({ path: './tjpe-pagina-consulta.png' });
    
    // ETAPA 3: ANALISAR O FORMULÁRIO DE CONSULTA
    console.log('\n=== ETAPA 3: ANALISANDO FORMULÁRIO DE CONSULTA ===');
    
    // Verificar todos os inputs na página
    console.log('Verificando inputs na página...');
    const inputs = await page.$$('input');
    console.log(`Encontrados ${inputs.length} inputs na página`);
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const id = await input.getAttribute('id');
      const name = await input.getAttribute('name');
      const type = await input.getAttribute('type');
      const placeholder = await input.getAttribute('placeholder');
      const value = await input.getAttribute('value');
      
      console.log(`Input ${i+1}: id="${id}", name="${name}", type="${type}", placeholder="${placeholder}", value="${value}"`);
      
      // Destacar o input para visualização
      await page.evaluate((idx) => {
        const inputs = document.querySelectorAll('input');
        if (inputs[idx]) {
          inputs[idx].style.border = '2px solid red';
        }
      }, i);
      
      // Tirar screenshot para inputs relevantes
      if (id && (id.includes('processo') || id.includes('Processo') || type === 'text')) {
        await page.screenshot({ path: `./tjpe-input-${i+1}-${id || name || type}.png` });
      }
    }
    
    // Verificar todos os botões na página
    console.log('\nVerificando botões na página...');
    const botoes = await page.$$('button, input[type="submit"], input[type="button"]');
    console.log(`Encontrados ${botoes.length} botões na página`);
    
    for (let i = 0; i < botoes.length; i++) {
      const botao = botoes[i];
      const id = await botao.getAttribute('id');
      const name = await botao.getAttribute('name');
      const type = await botao.getAttribute('type');
      const value = await botao.getAttribute('value');
      const texto = await botao.textContent();
      
      console.log(`Botão ${i+1}: id="${id}", name="${name}", type="${type}", value="${value}", texto="${texto?.trim()}"`);
      
      // Destacar o botão para visualização
      await page.evaluate((idx) => {
        const botoes = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
        if (botoes[idx]) {
          botoes[idx].style.border = '2px solid blue';
        }
      }, i);
      
      // Tirar screenshot para botões relevantes
      if (id && (id.includes('consulta') || id.includes('Consulta') || id.includes('pesquisa') || id.includes('Pesquisa'))) {
        await page.screenshot({ path: `./tjpe-botao-${i+1}-${id || name || type}.png` });
      }
    }
    
    // Analisar o HTML do formulário
    console.log('\nAnalisando HTML do formulário de consulta...');
    const formHtml = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form ? form.outerHTML : 'Formulário não encontrado';
    });
    
    console.log('HTML do formulário:');
    console.log(formHtml.substring(0, 500) + '... (truncado)');
    
    // Verificar se há campos específicos para o número do processo
    console.log('\nVerificando campos específicos para número do processo...');
    
    // Lista de possíveis seletores para o campo de número do processo
    const seletoresNumeroProcesso = [
      'input[id*="processo"]',
      'input[id*="Processo"]',
      'input[name*="processo"]',
      'input[name*="Processo"]',
      'input[placeholder*="processo"]',
      'input[placeholder*="Processo"]',
      '#numeroProcesso',
      '#processoNumero',
      '#numProcesso'
    ];
    
    for (const seletor of seletoresNumeroProcesso) {
      const elementos = await page.$$(seletor);
      console.log(`Seletor "${seletor}": ${elementos.length} elementos encontrados`);
      
      for (let i = 0; i < elementos.length; i++) {
        const elemento = elementos[i];
        const id = await elemento.getAttribute('id');
        const name = await elemento.getAttribute('name');
        
        console.log(`  Elemento ${i+1}: id="${id}", name="${name}"`);
      }
    }
    
    // ETAPA 4: TENTAR PREENCHER O NÚMERO DO PROCESSO
    console.log('\n=== ETAPA 4: TENTANDO PREENCHER O NÚMERO DO PROCESSO ===');
    
    // Verificar se o campo de número do processo está visível
    const campoNumeroProcesso = await page.$('input[id*="processo"], input[id*="Processo"], input[name*="processo"], input[name*="Processo"]');
    
    if (campoNumeroProcesso) {
      const id = await campoNumeroProcesso.getAttribute('id');
      const name = await campoNumeroProcesso.getAttribute('name');
      
      console.log(`Campo de número do processo encontrado: id="${id}", name="${name}"`);
      
      // Tentar preencher o campo
      console.log(`Tentando preencher o campo com o número "${NUMERO_PROCESSO}"...`);
      await campoNumeroProcesso.fill(NUMERO_PROCESSO);
      
      // Verificar se o preenchimento foi bem-sucedido
      const valorPreenchido = await campoNumeroProcesso.inputValue();
      console.log(`Valor preenchido: "${valorPreenchido}"`);
      
      // Tirar screenshot após preencher
      await page.screenshot({ path: './tjpe-apos-preencher-processo.png' });
    } else {
      console.log('Campo de número do processo não encontrado diretamente.');
      
      // Verificar se há múltiplos campos para diferentes partes do número do processo
      console.log('\nVerificando se há múltiplos campos para o número do processo...');
      
      // Usar JavaScript para analisar a estrutura da página
      const estruturaCampos = await page.evaluate(() => {
        // Função para encontrar campos de input próximos
        function encontrarCamposProximos() {
          const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
          
          // Filtrar inputs que estão próximos uns dos outros
          const grupos = [];
          let grupoAtual = [];
          
          for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            const rect = input.getBoundingClientRect();
            
            if (grupoAtual.length === 0) {
              grupoAtual.push({
                element: input,
                id: input.id,
                name: input.name,
                rect: {
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height
                }
              });
            } else {
              const ultimoInput = grupoAtual[grupoAtual.length - 1];
              const ultimoRect = ultimoInput.rect;
              
              // Verificar se os inputs estão na mesma linha horizontal
              // e próximos uns dos outros
              const mesmaLinha = Math.abs(rect.top - ultimoRect.top) < 20;
              const proximo = Math.abs(rect.left - (ultimoRect.left + ultimoRect.width)) < 50;
              
              if (mesmaLinha && proximo) {
                grupoAtual.push({
                  element: input,
                  id: input.id,
                  name: input.name,
                  rect: {
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                  }
                });
              } else {
                if (grupoAtual.length > 1) {
                  grupos.push([...grupoAtual]);
                }
                grupoAtual = [{
                  element: input,
                  id: input.id,
                  name: input.name,
                  rect: {
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                  }
                }];
              }
            }
          }
          
          if (grupoAtual.length > 1) {
            grupos.push(grupoAtual);
          }
          
          return grupos;
        }
        
        return encontrarCamposProximos();
      });
      
      console.log(`Encontrados ${estruturaCampos.length} grupos de campos próximos`);
      
      for (let i = 0; i < estruturaCampos.length; i++) {
        const grupo = estruturaCampos[i];
        console.log(`Grupo ${i+1}: ${grupo.length} campos`);
        
        for (let j = 0; j < grupo.length; j++) {
          const campo = grupo[j];
          console.log(`  Campo ${j+1}: id="${campo.id}", name="${campo.name}"`);
        }
      }
    }
    
    // ETAPA 5: IDENTIFICAR O BOTÃO DE CONSULTA
    console.log('\n=== ETAPA 5: IDENTIFICANDO O BOTÃO DE CONSULTA ===');
    
    // Lista de possíveis seletores para o botão de consulta
    const seletoresBotaoConsulta = [
      'button:has-text("Consultar")',
      'button:has-text("Pesquisar")',
      'button:has-text("Buscar")',
      'input[type="submit"][value*="Consultar"]',
      'input[type="submit"][value*="Pesquisar"]',
      'input[type="submit"][value*="Buscar"]',
      'button[id*="consulta"]',
      'button[id*="pesquisa"]',
      'input[id*="consulta"]',
      'input[id*="pesquisa"]'
    ];
    
    for (const seletor of seletoresBotaoConsulta) {
      try {
        const botoes = await page.$$(seletor);
        console.log(`Seletor "${seletor}": ${botoes.length} elementos encontrados`);
        
        for (let i = 0; i < botoes.length; i++) {
          const botao = botoes[i];
          const id = await botao.getAttribute('id');
          const name = await botao.getAttribute('name');
          const value = await botao.getAttribute('value');
          const texto = await botao.textContent();
          
          console.log(`  Botão ${i+1}: id="${id}", name="${name}", value="${value}", texto="${texto?.trim()}"`);
          
          // Destacar o botão
          await page.evaluate((sel, idx) => {
            const botoes = document.querySelectorAll(sel);
            if (botoes[idx]) {
              botoes[idx].style.border = '3px solid green';
            }
          }, seletor, i);
          
          // Tirar screenshot
          await page.screenshot({ path: `./tjpe-botao-consulta-${i+1}-${seletor.replace(/[^\w]/g, '-')}.png` });
        }
      } catch (error) {
        console.log(`Erro ao usar seletor "${seletor}": ${error.message}`);
      }
    }
    
    // Aguardar para visualização manual
    console.log('\nAguardando 1 minuto para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
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
diagnosticarConsultaTJPE();
