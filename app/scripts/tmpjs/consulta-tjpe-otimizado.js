/**
 * Script otimizado para consulta de processos no TJPE
 * Preenchendo corretamente os campos separados do número do processo
 */

const { chromium } = require('playwright');

// Credenciais para acesso ao TJPE
const credenciais = {
  usuario: '84769858434',
  senha: '8476guardia'
};

// Número de processo para consulta
const NUMERO_PROCESSO = '0000398-17.2017.8.17.2001';

/**
 * Função para separar o número do processo em suas partes componentes
 * @param {string} numeroCompleto Número do processo no formato CNJ
 * @returns {object} Objeto com as partes separadas do número
 */
function separarNumeroProcesso(numeroCompleto) {
  // Remover caracteres não numéricos
  const numeroLimpo = numeroCompleto.replace(/[^0-9]/g, '');
  
  // Separar as partes do número (formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO)
  return {
    sequencial: numeroLimpo.substring(0, 7),
    digito: numeroLimpo.substring(7, 9),
    ano: numeroLimpo.substring(9, 13),
    justica: numeroLimpo.substring(13, 14),
    tribunal: numeroLimpo.substring(14, 16),
    origem: numeroLimpo.substring(16, 20)
  };
}

async function consultarProcessoTJPE() {
  console.log('Iniciando consulta de processo no TJPE...');
  console.log(`Número do processo: ${NUMERO_PROCESSO}`);
  
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
    
    // Tirar screenshot da página de login
    await page.screenshot({ path: './tjpe-otimizado-login-page.png' });
    
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
    await page.screenshot({ path: './tjpe-otimizado-apos-login.png' });
    
    // ETAPA 2: NAVEGAR PARA A PÁGINA DE CONSULTA
    console.log('\n=== ETAPA 2: NAVEGANDO PARA A PÁGINA DE CONSULTA ===');
    
    console.log('Navegando para a página de consulta de processos...');
    await page.goto('https://pje.cloud.tjpe.jus.br/1g/Processo/ConsultaProcesso/listView.seam', {
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    // Tirar screenshot da página de consulta
    await page.screenshot({ path: './tjpe-otimizado-pagina-consulta.png' });
    
    // ETAPA 3: PREENCHER O NÚMERO DO PROCESSO
    console.log('\n=== ETAPA 3: PREENCHENDO O NÚMERO DO PROCESSO ===');
    
    // Separar o número do processo em suas partes
    const partesNumero = separarNumeroProcesso(NUMERO_PROCESSO);
    console.log('Partes do número do processo:', partesNumero);
    
    // Preencher os campos do formulário usando os seletores visíveis na imagem
    console.log('Preenchendo os campos do formulário...');
    
    // Baseado na imagem, vamos preencher os campos separados
    // Vamos usar uma abordagem robusta com várias tentativas
    
    // Primeiro, vamos tentar encontrar todos os inputs no formulário
    const inputs = await page.$$('#numeroProcesso input');
    console.log(`Encontrados ${inputs.length} inputs no formulário de número do processo`);
    
    if (inputs.length >= 6) {
      // Se encontramos pelo menos 6 inputs, vamos preencher na ordem
      console.log('Preenchendo campos separados na ordem...');
      
      // Preencher os campos na ordem: sequencial, digito, ano, justica, tribunal, origem
      await inputs[0].fill(partesNumero.sequencial);
      await inputs[1].fill(partesNumero.digito);
      await inputs[2].fill(partesNumero.ano);
      await inputs[3].fill(partesNumero.justica);
      await inputs[4].fill(partesNumero.tribunal);
      await inputs[5].fill(partesNumero.origem);
    } else {
      // Se não encontramos os campos pelo seletor acima, vamos tentar uma abordagem mais específica
      console.log('Tentando abordagem alternativa...');
      
      // Usar JavaScript para preencher os campos
      await page.evaluate((partes) => {
        // Função para encontrar e preencher os campos do número do processo
        function preencherCamposProcesso() {
          // Tentar encontrar os inputs pelo atributo placeholder ou pelo tamanho máximo
          const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
          
          // Filtrar apenas inputs visíveis
          const inputsVisiveis = inputs.filter(input => {
            const style = window.getComputedStyle(input);
            return style.display !== 'none' && style.visibility !== 'hidden';
          });
          
          // Encontrar os inputs que parecem ser para o número do processo
          // Geralmente estão agrupados e têm tamanhos específicos
          let camposProcesso = [];
          
          // Procurar por inputs que estão próximos uns dos outros
          for (let i = 0; i < inputsVisiveis.length; i++) {
            const input = inputsVisiveis[i];
            const rect = input.getBoundingClientRect();
            
            // Se já temos alguns campos e este está próximo do último
            if (camposProcesso.length > 0) {
              const ultimoRect = camposProcesso[camposProcesso.length - 1].getBoundingClientRect();
              const mesmaLinha = Math.abs(rect.top - ultimoRect.top) < 20;
              const proximo = Math.abs(rect.left - (ultimoRect.left + ultimoRect.width)) < 50;
              
              if (mesmaLinha && proximo) {
                camposProcesso.push(input);
              }
            } else {
              // Se é o primeiro campo que estamos considerando
              // Verificar se parece ser um campo de processo (geralmente tem largura pequena)
              if (rect.width < 100) {
                camposProcesso.push(input);
              }
            }
          }
          
          // Se encontramos pelo menos 6 campos, vamos preencher
          if (camposProcesso.length >= 6) {
            camposProcesso[0].value = partes.sequencial;
            camposProcesso[1].value = partes.digito;
            camposProcesso[2].value = partes.ano;
            camposProcesso[3].value = partes.justica;
            camposProcesso[4].value = partes.tribunal;
            camposProcesso[5].value = partes.origem;
            return true;
          }
          
          // Se não encontramos pelo método acima, vamos tentar outra abordagem
          // Procurar por inputs com tamanhos específicos
          const sequencialInput = inputsVisiveis.find(input => input.maxLength === 7);
          const digitoInput = inputsVisiveis.find(input => input.maxLength === 2);
          const anoInput = inputsVisiveis.find(input => input.maxLength === 4 && !input.value);
          const justicaInput = inputsVisiveis.find(input => input.maxLength === 1);
          const tribunalInput = inputsVisiveis.find(input => input.maxLength === 2 && input !== digitoInput);
          const origemInput = inputsVisiveis.find(input => input.maxLength === 4 && input !== anoInput);
          
          if (sequencialInput && digitoInput && anoInput && justicaInput && tribunalInput && origemInput) {
            sequencialInput.value = partes.sequencial;
            digitoInput.value = partes.digito;
            anoInput.value = partes.ano;
            justicaInput.value = partes.justica;
            tribunalInput.value = partes.tribunal;
            origemInput.value = partes.origem;
            return true;
          }
          
          return false;
        }
        
        return preencherCamposProcesso();
      }, partesNumero);
    }
    
    // Tirar screenshot após preencher os campos
    await page.screenshot({ path: './tjpe-otimizado-apos-preencher.png' });
    
    // ETAPA 4: CLICAR NO BOTÃO DE CONSULTA
    console.log('\n=== ETAPA 4: CLICANDO NO BOTÃO DE CONSULTA ===');
    
    // Tentar encontrar o botão de consulta
    const botaoConsulta = await page.$('input[value="Consultar"], button:has-text("Consultar")');
    
    if (botaoConsulta) {
      console.log('Botão de consulta encontrado');
      await botaoConsulta.click();
    } else {
      console.log('Botão não encontrado diretamente, tentando outras abordagens');
      
      // Tentar encontrar o botão por outros atributos
      const botoesPossiveis = [
        'input[type="submit"]',
        'button[type="submit"]',
        'button:has-text("Pesquisar")',
        'input[value="Pesquisar"]'
      ];
      
      let botaoEncontrado = false;
      
      for (const seletor of botoesPossiveis) {
        const botao = await page.$(seletor);
        if (botao) {
          console.log(`Botão encontrado com seletor: ${seletor}`);
          await botao.click();
          botaoEncontrado = true;
          break;
        }
      }
      
      if (!botaoEncontrado) {
        console.log('Nenhum botão encontrado, tentando clicar via JavaScript');
        
        // Tentar clicar via JavaScript
        await page.evaluate(() => {
          // Procurar botões por texto
          const botoes = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
          
          // Filtrar botões visíveis
          const botoesVisiveis = botoes.filter(botao => {
            const style = window.getComputedStyle(botao);
            return style.display !== 'none' && style.visibility !== 'hidden';
          });
          
          // Procurar botão por texto ou valor
          const botaoConsulta = botoesVisiveis.find(botao => {
            const texto = (botao.textContent || '').toLowerCase();
            const valor = (botao.value || '').toLowerCase();
            return texto.includes('consultar') || 
                   texto.includes('pesquisar') || 
                   valor.includes('consultar') || 
                   valor.includes('pesquisar');
          });
          
          if (botaoConsulta) {
            botaoConsulta.click();
            return true;
          }
          
          // Se não encontrar por texto, tentar o primeiro botão de submit
          const botaoSubmit = botoesVisiveis.find(botao => 
            botao.type === 'submit' || 
            botao.getAttribute('role') === 'button'
          );
          
          if (botaoSubmit) {
            botaoSubmit.click();
            return true;
          }
          
          return false;
        });
      }
    }
    
    // Aguardar carregamento dos resultados
    console.log('Aguardando carregamento dos resultados...');
    await page.waitForTimeout(5000);
    
    // Tirar screenshot dos resultados
    await page.screenshot({ path: './tjpe-otimizado-resultados.png' });
    
    // ETAPA 5: VERIFICAR RESULTADOS
    console.log('\n=== ETAPA 5: VERIFICANDO RESULTADOS ===');
    
    // Verificar se há resultados na página
    const temResultados = await page.evaluate(() => {
      // Verificar se há tabela de resultados
      const tabela = document.querySelector('table');
      if (tabela) return true;
      
      // Verificar se há mensagem de "nenhum processo encontrado"
      const mensagemNaoEncontrado = Array.from(document.querySelectorAll('div, span, p')).some(
        elem => (elem.textContent || '').includes('Nenhum processo encontrado')
      );
      
      if (mensagemNaoEncontrado) return false;
      
      // Verificar se há algum elemento que pareça ser um resultado
      const elementosResultado = document.querySelectorAll('[id*="resultado"], [class*="resultado"]');
      return elementosResultado.length > 0;
    });
    
    if (temResultados) {
      console.log('Resultados encontrados na página!');
    } else {
      console.log('Nenhum resultado encontrado ou não foi possível identificar resultados.');
    }
    
    // Aguardar para visualização manual
    console.log('\nAguardando 2 minutos para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    await new Promise(resolve => setTimeout(resolve, 120000));
    
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
consultarProcessoTJPE();
