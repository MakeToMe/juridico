/**
 * Script para testar a consulta de processos no TJPE
 * Utilizando o número de processo: 0000398-17.2017.8.17.2001
 */

const { chromium } = require('playwright');

// Credenciais para acesso ao TJPE
const credenciais = {
  usuario: '84769858434',
  senha: '8476guardia'
};

// Número de processo para consulta
const NUMERO_PROCESSO = '0000398-17.2017.8.17.2001';

async function testarConsultaTJPE() {
  console.log('Iniciando teste de consulta de processo no TJPE...');
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
    
    // Habilitar logs de console da página
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
    
    // Tirar screenshot da página de login
    await page.screenshot({ path: './tjpe-consulta-login-page.png' });
    
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
    await page.screenshot({ path: './tjpe-consulta-apos-login.png' });
    
    // ETAPA 2: NAVEGAR PARA A PÁGINA DE CONSULTA
    console.log('\n=== ETAPA 2: NAVEGANDO PARA A PÁGINA DE CONSULTA ===');
    
    console.log('Navegando para a página de consulta de processos...');
    await page.goto('https://pje.cloud.tjpe.jus.br/1g/Processo/ConsultaProcesso/listView.seam', {
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    // Tirar screenshot da página de consulta
    await page.screenshot({ path: './tjpe-consulta-pagina-consulta.png' });
    
    // ETAPA 3: PREENCHER O NÚMERO DO PROCESSO
    console.log('\n=== ETAPA 3: PREENCHENDO O NÚMERO DO PROCESSO ===');
    
    // Primeiro, vamos verificar se existe um campo único para o número do processo
    const campoUnico = await page.$('#formConsultaProcesso\\:numeroProcesso');
    
    if (campoUnico) {
      console.log('Encontrado campo único para o número do processo');
      await campoUnico.fill(NUMERO_PROCESSO);
      await page.screenshot({ path: './tjpe-consulta-campo-unico.png' });
    } else {
      console.log('Campo único não encontrado, tentando abordagem com campos separados');
      
      // Tentar preencher usando JavaScript diretamente
      // Esta abordagem é mais robusta para lidar com campos dinâmicos
      const preenchido = await page.evaluate((numeroProcesso) => {
        // Função para preencher o número do processo em campos separados
        function preencherNumeroProcesso(numero) {
          // Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
          // Exemplo: 0000398-17.2017.8.17.2001
          
          // Remover formatação e dividir o número
          const numeroLimpo = numero.replace(/[^0-9]/g, '');
          
          // Tentar encontrar os campos pelo ID ou nome
          const possiveisCampos = [
            // Tentativa 1: IDs específicos
            document.querySelector('#formConsultaProcesso\\:numeroProcesso'),
            
            // Tentativa 2: Campos separados com IDs específicos
            {
              sequencial: document.querySelector('#formConsultaProcesso\\:numeroProcessoSequencial'),
              digito: document.querySelector('#formConsultaProcesso\\:numeroProcessoDigito'),
              ano: document.querySelector('#formConsultaProcesso\\:numeroProcessoAno'),
              justica: document.querySelector('#formConsultaProcesso\\:numeroProcessoJustica'),
              tribunal: document.querySelector('#formConsultaProcesso\\:numeroProcessoTribunal'),
              origem: document.querySelector('#formConsultaProcesso\\:numeroProcessoOrigem')
            },
            
            // Tentativa 3: Qualquer input dentro do formulário
            Array.from(document.querySelectorAll('#formConsultaProcesso input[type="text"]'))
          ];
          
          // Verificar se encontramos um campo único
          if (possiveisCampos[0]) {
            possiveisCampos[0].value = numero;
            return { metodo: 'campo_unico', sucesso: true };
          }
          
          // Verificar se encontramos campos separados
          const camposSeparados = possiveisCampos[1];
          if (camposSeparados.sequencial && camposSeparados.digito && camposSeparados.ano) {
            // Extrair partes do número
            // Formato: NNNNNNN-DD.AAAA.J.TR.OOOO
            const partes = {
              sequencial: numeroLimpo.substring(0, 7),
              digito: numeroLimpo.substring(7, 9),
              ano: numeroLimpo.substring(9, 13),
              justica: numeroLimpo.substring(13, 14),
              tribunal: numeroLimpo.substring(14, 16),
              origem: numeroLimpo.substring(16, 20)
            };
            
            // Preencher os campos
            camposSeparados.sequencial.value = partes.sequencial;
            camposSeparados.digito.value = partes.digito;
            camposSeparados.ano.value = partes.ano;
            camposSeparados.justica.value = partes.justica;
            camposSeparados.tribunal.value = partes.tribunal;
            camposSeparados.origem.value = partes.origem;
            
            return { metodo: 'campos_separados', sucesso: true };
          }
          
          // Tentar com todos os inputs de texto no formulário
          const inputs = possiveisCampos[2];
          if (inputs && inputs.length > 0) {
            // Se houver apenas um input, preencher com o número completo
            if (inputs.length === 1) {
              inputs[0].value = numero;
              return { metodo: 'input_unico', sucesso: true };
            }
            
            // Se houver múltiplos inputs, tentar preencher em sequência
            if (inputs.length >= 6) {
              // Extrair partes do número
              const partes = {
                sequencial: numeroLimpo.substring(0, 7),
                digito: numeroLimpo.substring(7, 9),
                ano: numeroLimpo.substring(9, 13),
                justica: numeroLimpo.substring(13, 14),
                tribunal: numeroLimpo.substring(14, 16),
                origem: numeroLimpo.substring(16, 20)
              };
              
              // Identificar campos por tamanho ou placeholder
              for (const input of inputs) {
                const placeholder = input.placeholder || '';
                const maxLength = input.maxLength || 0;
                
                if (maxLength === 7 || placeholder.includes('sequencial')) {
                  input.value = partes.sequencial;
                } else if (maxLength === 2 || placeholder.includes('digito')) {
                  input.value = partes.digito;
                } else if (maxLength === 4 && placeholder.includes('ano')) {
                  input.value = partes.ano;
                } else if (maxLength === 1 || placeholder.includes('justica')) {
                  input.value = partes.justica;
                } else if (maxLength === 2 && placeholder.includes('tribunal')) {
                  input.value = partes.tribunal;
                } else if (maxLength === 4 && placeholder.includes('origem')) {
                  input.value = partes.origem;
                }
              }
              
              return { metodo: 'multiplos_inputs', sucesso: true };
            }
          }
          
          // Última tentativa: procurar por qualquer input visível na página
          const todosInputs = document.querySelectorAll('input[type="text"]');
          if (todosInputs.length > 0) {
            // Filtrar apenas inputs visíveis
            const inputsVisiveis = Array.from(todosInputs).filter(input => {
              const style = window.getComputedStyle(input);
              return style.display !== 'none' && style.visibility !== 'hidden';
            });
            
            if (inputsVisiveis.length > 0) {
              // Procurar por input com placeholder ou label relacionado a processo
              const inputProcesso = inputsVisiveis.find(input => {
                const placeholder = (input.placeholder || '').toLowerCase();
                return placeholder.includes('processo') || placeholder.includes('número');
              });
              
              if (inputProcesso) {
                inputProcesso.value = numero;
                return { metodo: 'input_processo', sucesso: true };
              }
              
              // Se não encontrar específico, usar o primeiro input visível
              inputsVisiveis[0].value = numero;
              return { metodo: 'primeiro_input', sucesso: true };
            }
          }
          
          return { metodo: 'nenhum', sucesso: false };
        }
        
        // Executar a função e retornar o resultado
        return preencherNumeroProcesso(numeroProcesso);
      }, NUMERO_PROCESSO);
      
      console.log(`Resultado do preenchimento: ${JSON.stringify(preenchido)}`);
      await page.screenshot({ path: './tjpe-consulta-apos-preencher.png' });
    }
    
    // ETAPA 4: CLICAR NO BOTÃO DE CONSULTA
    console.log('\n=== ETAPA 4: CLICANDO NO BOTÃO DE CONSULTA ===');
    
    // Tentar encontrar o botão de consulta
    const botaoConsulta = await page.$('#formConsultaProcesso\\:searchProcessos');
    
    if (botaoConsulta) {
      console.log('Botão de consulta encontrado pelo ID');
      await botaoConsulta.click();
    } else {
      console.log('Botão não encontrado pelo ID, tentando outras abordagens');
      
      // Tentar encontrar o botão por texto ou outros atributos
      const botoesPossiveis = [
        'button:has-text("Consultar")',
        'input[type="submit"][value="Consultar"]',
        'button:has-text("Pesquisar")',
        'input[type="submit"][value="Pesquisar"]',
        'button[id*="search"]',
        'button[id*="consulta"]',
        'button[id*="pesquisa"]'
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
          
          // Se não encontrar por texto, procurar por ID
          const botaoPorId = botoesVisiveis.find(botao => {
            const id = (botao.id || '').toLowerCase();
            return id.includes('search') || 
                   id.includes('consulta') || 
                   id.includes('pesquisa');
          });
          
          if (botaoPorId) {
            botaoPorId.click();
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
    await page.screenshot({ path: './tjpe-consulta-resultados.png' });
    
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
    console.error('Erro durante o teste:', error);
  } finally {
    // Fechar o navegador
    console.log('Fechando o navegador...');
    await browser.close();
    console.log('Navegador fechado com sucesso!');
  }
}

// Executar o teste
testarConsultaTJPE();
