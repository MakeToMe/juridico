/**
 * Script para extrair dados de um processo no TJAL
 * Apenas extrai e exibe os dados, sem salvar no banco de dados
 */

const { chromium } = require('playwright');

// Número do processo a ser consultado
const NUMERO_PROCESSO = '0727108-89.2024.8.02.0001';

// Credenciais para acesso ao TJAL
const credenciais = {
  site: 'https://www2.tjal.jus.br/sajcas/login?service=https%3A%2F%2Fwww2.tjal.jus.br%2Fesaj%2Fj_spring_cas_security_check',
  usuario: '847.698.584-34',
  senha: '8476guardia'
};

/**
 * Função principal para consultar e extrair dados de um processo no TJAL
 */
async function extrairDadosTJAL() {
  console.log(`Iniciando extração de dados do processo ${NUMERO_PROCESSO} no TJAL...`);
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-dev-shm-usage'],
    timeout: 60000,
  });
  
  let page;
  
  try {
    console.log('Configurando contexto do navegador...');
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      ignoreHTTPSErrors: true,
      navigationTimeout: 90000,
      timeout: 90000
    });
    
    page = await context.newPage();
    
    // ETAPA 1: LOGIN NO SISTEMA
    console.log('\n=== ETAPA 1: REALIZANDO LOGIN ===');
    
    console.log('Navegando para a página de login...');
    await page.goto(credenciais.site, { 
      timeout: 60000, 
      waitUntil: 'networkidle' 
    });
    
    console.log('Verificando formulário de login...');
    await page.waitForSelector('#usernameForm', { timeout: 30000 });
    
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', credenciais.usuario);
    await page.fill('#passwordForm', credenciais.senha);
    
    console.log('Clicando no botão de login...');
    await Promise.all([
      page.waitForNavigation({ timeout: 60000 }),
      page.click('#pbEntrar')
    ]);
    
    // Verificar resultado do login
    const urlAposLogin = page.url();
    console.log(`URL após login: ${urlAposLogin}`);
    
    // Verificar se há mensagem de erro
    const erroLogin = await page.$('.alert-danger');
    if (erroLogin) {
      const mensagemErro = await erroLogin.textContent();
      throw new Error(`Erro de login: ${mensagemErro || 'Credenciais inválidas'}`);
    }
    
    // Verificar se estamos em uma página válida após o login
    if (!(urlAposLogin.includes('esaj') || urlAposLogin.includes('cpopg'))) {
      throw new Error('Redirecionamento após login não ocorreu como esperado');
    }
    
    console.log('Login realizado com sucesso!');
    
    // ETAPA 2: CONSULTA DO PROCESSO
    console.log('\n=== ETAPA 2: CONSULTANDO PROCESSO ===');
    
    // Navegar para a página de consulta
    console.log('Navegando para a página de consulta...');
    await page.goto('https://www2.tjal.jus.br/cpopg/search.do', { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    // Extrair as partes do número do processo
    console.log('Preenchendo o número do processo...');
    const partePrimeiroCampo = NUMERO_PROCESSO.substring(0, 15); // NNNNNNN-DD.AAAA (0727108-89.2024)
    const parteTerceiroCampo = NUMERO_PROCESSO.substring(21);    // OOOO (0001)
    
    console.log(`Partes do processo: Primeiro="${partePrimeiroCampo}", Terceiro="${parteTerceiroCampo}"`);
    
    // Preencher os campos
    await page.fill('#numeroDigitoAnoUnificado', partePrimeiroCampo);
    await page.fill('#foroNumeroUnificado', parteTerceiroCampo);
    
    // Garantir que o radio button "Unificado" esteja selecionado
    await page.check('#radioNumeroUnificado');
    
    // Verificar o que foi preenchido
    const valorCampo1 = await page.inputValue('#numeroDigitoAnoUnificado');
    const valorCampo2 = await page.inputValue('#foroNumeroUnificado');
    console.log(`Valores preenchidos: Campo 1="${valorCampo1}", Campo 2="${valorCampo2}"`);
    
    // Tirar screenshot antes de consultar
    await page.screenshot({ path: './consulta-antes.png' });
    
    // Clicar no botão de consultar
    console.log('Clicando no botão Consultar...');
    await Promise.all([
      page.waitForNavigation({ timeout: 30000 }),
      page.click('#botaoConsultarProcessos')
    ]);
    
    // Verificar resultado da consulta
    const urlAposConsulta = page.url();
    console.log(`URL após consulta: ${urlAposConsulta}`);
    
    // Tirar screenshot após consulta
    await page.screenshot({ path: './consulta-resultado.png' });
    
    // Verificar se o processo foi encontrado
    const mensagemErro = await page.$('.mensagemErro');
    if (mensagemErro) {
      const textoErro = await mensagemErro.textContent();
      console.log(`Processo não encontrado: ${textoErro}`);
      throw new Error(`Processo não encontrado: ${textoErro}`);
    }
    
    // ETAPA 3: EXTRAIR DADOS DO PROCESSO
    console.log('\n=== ETAPA 3: EXTRAINDO DADOS DO PROCESSO ===');
    
    // Aguardar um pouco para garantir que todos os elementos estejam carregados
    console.log('Aguardando 5 segundos para garantir carregamento completo da página...');
    await page.waitForTimeout(5000);
    
    // Extrair informações básicas
    const dadosProcesso = await page.evaluate(() => {
      // Função para extrair texto de um seletor, retornando string vazia se não encontrar
      function extrairTexto(seletor) {
        const elemento = document.querySelector(seletor);
        return elemento ? elemento.textContent.trim().replace(/\s+/g, ' ') : '';
      }
      
      // Função para limpar texto (remover quebras de linha e espaços extras)
      function limparTexto(texto) {
        if (!texto) return '';
        return texto.replace(/\s+/g, ' ').trim();
      }
      
      // Extrair dados básicos do processo
      const numeroProcesso = extrairTexto('#numeroProcesso');
      const classe = extrairTexto('#classeProcesso');
      const assunto = extrairTexto('#assuntoProcesso');
      const distribuicao = extrairTexto('#dataDistribuicaoProcesso');
      const juiz = extrairTexto('#juizProcesso');
      const valorAcao = extrairTexto('#valorAcaoProcesso');
      
      // Extrair comarca e vara - tentar diferentes seletores
      let vara = extrairTexto('.secaoVara');
      let comarca = extrairTexto('.secaoComarca');
      
      // Tentar extrair dos cabeçalhos da página
      if (!vara || !comarca) {
        const cabecalhos = document.querySelectorAll('.secaoFormBody');
        cabecalhos.forEach(cab => {
          const texto = cab.textContent.trim();
          if (texto.includes('Vara')) {
            vara = texto;
          }
          if (texto.includes('Foro') || texto.includes('Comarca')) {
            comarca = texto;
          }
        });
      }
      
      // Tentar extrair de qualquer elemento que contenha o texto
      if (!vara) {
        const todosElementos = document.querySelectorAll('*');
        for (const elem of todosElementos) {
          const texto = elem.textContent.trim();
          if (texto.includes('Vara') && texto.length < 50) {
            vara = texto;
            break;
          }
        }
      }
      
      if (!comarca) {
        const todosElementos = document.querySelectorAll('*');
        for (const elem of todosElementos) {
          const texto = elem.textContent.trim();
          if ((texto.includes('Foro') || texto.includes('Comarca')) && texto.length < 50) {
            comarca = texto;
            break;
          }
        }
      }
      
      // Extrair status do processo (julgado, transitado, etc.)
      const statusProcesso = Array.from(document.querySelectorAll('.labelClass'))
        .map(el => el.textContent.trim())
        .filter(text => text.length > 0);
      
      // Extrair partes do processo
      const partes = [];
      const advogadosAutor = [];
      let parteAtual = null;
      
      // Extrair partes e advogados
      const tabelaPartes = document.querySelector('#tablePartesPrincipais');
      if (tabelaPartes) {
        const linhas = tabelaPartes.querySelectorAll('tr');
        
        linhas.forEach(linha => {
          const colunas = linha.querySelectorAll('td');
          
          if (colunas.length >= 2) {
            const tipo = limparTexto(colunas[0].textContent);
            const nome = limparTexto(colunas[1].textContent);
            
            // Verificar se é uma parte principal (Autor ou Réu)
            if (tipo.includes('Autor') || tipo.includes('Réu')) {
              parteAtual = tipo;
              partes.push({ tipo, nome });
            }
            // Se for advogado, adicionar ao último autor ou réu
            else if (tipo.includes('Advogado')) {
              // Se for advogado do autor, adicionar à lista de advogados do autor
              if (parteAtual && parteAtual.includes('Autor')) {
                advogadosAutor.push(nome);
              }
            }
          }
        });
      }
      
      // Se não conseguiu extrair as partes da tabela, tentar outra abordagem
      if (partes.length === 0) {
        // Tentar encontrar as partes por outros meios
        const secaoPartes = document.querySelector('#secaoPartes');
        if (secaoPartes) {
          const polos = secaoPartes.querySelectorAll('.polo');
          
          polos.forEach(polo => {
            const texto = polo.textContent.trim();
            if (texto.includes('Autor:')) {
              const nome = limparTexto(texto.replace('Autor:', ''));
              partes.push({ tipo: 'Autor', nome });
            } else if (texto.includes('Réu:')) {
              const nome = limparTexto(texto.replace('Réu:', ''));
              partes.push({ tipo: 'Réu', nome });
            }
          });
          
          // Buscar advogados
          const advs = secaoPartes.querySelectorAll('.advogado');
          advs.forEach(adv => {
            const nome = limparTexto(adv.textContent.replace('Advogado:', ''));
            // Verificar se está próximo a um autor
            let isAdvAutor = false;
            let prevElement = adv.previousElementSibling;
            while (prevElement) {
              if (prevElement.textContent.includes('Autor:')) {
                isAdvAutor = true;
                break;
              }
              prevElement = prevElement.previousElementSibling;
            }
            
            if (isAdvAutor) {
              advogadosAutor.push(nome);
            }
          });
        }
      }
      
      // Extrair movimentações do processo
      const movimentacoes = [];
      
      // Tentar diferentes seletores para a tabela de movimentações
      const seletoresMovimentacoes = [
        '#tabelaTodasMovimentacoes',
        '#tabelaUltimasMovimentacoes',
        '.movimentacaoProcesso',
        '.tabelaMovimentacoes'
      ];
      
      let tabelaMovimentacoes = null;
      
      // Tentar cada seletor até encontrar a tabela
      for (const seletor of seletoresMovimentacoes) {
        tabelaMovimentacoes = document.querySelector(seletor);
        if (tabelaMovimentacoes) break;
      }
      
      if (tabelaMovimentacoes) {
        const linhas = tabelaMovimentacoes.querySelectorAll('tr');
        
        linhas.forEach(linha => {
          const colunas = linha.querySelectorAll('td');
          
          if (colunas.length >= 2) {
            const data = limparTexto(colunas[0].textContent);
            const descricao = limparTexto(colunas[1].textContent);
            
            if (data && descricao) {
              movimentacoes.push({ data, descricao });
            }
          }
        });
      }
      
      // Se não encontrou movimentações, tentar buscar por outros elementos
      if (movimentacoes.length === 0) {
        // Tentar encontrar movimentações por outros meios
        const secaoMovimentacoes = document.querySelector('#divMovimentacoes');
        if (secaoMovimentacoes) {
          const itensMovimentacao = secaoMovimentacoes.querySelectorAll('.movimentacaoProcesso');
          
          itensMovimentacao.forEach(item => {
            const dataElement = item.querySelector('.dataMovimentacao');
            const descricaoElement = item.querySelector('.descricaoMovimentacao');
            
            if (dataElement && descricaoElement) {
              const data = limparTexto(dataElement.textContent);
              const descricao = limparTexto(descricaoElement.textContent);
              
              if (data && descricao) {
                movimentacoes.push({ data, descricao });
              }
            }
          });
        }
      }
      
      // Se ainda não encontrou movimentações, fazer uma busca mais genérica
      if (movimentacoes.length === 0) {
        // Buscar qualquer tabela que possa conter movimentações
        const todasTabelas = document.querySelectorAll('table');
        
        todasTabelas.forEach(tabela => {
          // Verificar se a tabela parece ser de movimentações (tem pelo menos uma linha com data)
          const primeiraLinha = tabela.querySelector('tr');
          if (primeiraLinha) {
            const colunas = primeiraLinha.querySelectorAll('td');
            if (colunas.length >= 2) {
              const possiveisLinhas = tabela.querySelectorAll('tr');
              
              possiveisLinhas.forEach(linha => {
                const cols = linha.querySelectorAll('td');
                if (cols.length >= 2) {
                  const data = limparTexto(cols[0].textContent);
                  const descricao = limparTexto(cols[1].textContent);
                  
                  // Verificar se parece uma data (DD/MM/AAAA)
                  if (data.match(/\d{2}\/\d{2}\/\d{4}/) && descricao) {
                    movimentacoes.push({ data, descricao });
                  }
                }
              });
            }
          }
        });
      }
      
      return {
        numeroProcesso,
        classe,
        assunto,
        distribuicao,
        juiz,
        valorAcao,
        vara,
        comarca,
        statusProcesso,
        partes,
        advogadosAutor,
        movimentacoes
      };
    });
    
    // Exibir os dados extraídos em formato JSON para facilitar a análise
    console.log('\n===== DADOS EXTRAÍDOS DO PROCESSO (JSON) =====');
    console.log(JSON.stringify(dadosProcesso, null, 2));
    
    // Exibir os dados em formato legível
    console.log('\n===== DADOS EXTRAÍDOS DO PROCESSO (FORMATADO) =====');
    console.log(`Número: ${dadosProcesso.numeroProcesso}`);
    console.log(`Classe: ${dadosProcesso.classe}`);
    console.log(`Assunto: ${dadosProcesso.assunto}`);
    console.log(`Vara: ${dadosProcesso.vara}`);
    console.log(`Comarca: ${dadosProcesso.comarca}`);
    console.log(`Distribuição: ${dadosProcesso.distribuicao}`);
    console.log(`Juiz: ${dadosProcesso.juiz}`);
    console.log(`Valor da Ação: ${dadosProcesso.valorAcao}`);
    
    if (dadosProcesso.statusProcesso && dadosProcesso.statusProcesso.length > 0) {
      console.log(`Status: ${dadosProcesso.statusProcesso.join(', ')}`);
    }
    
    console.log('\n----- PARTES DO PROCESSO -----');
    if (dadosProcesso.partes && dadosProcesso.partes.length > 0) {
      dadosProcesso.partes.forEach((parte, index) => {
        console.log(`${index + 1}. ${parte.tipo}: ${parte.nome}`);
      });
    } else {
      console.log('Nenhuma parte encontrada.');
    }
    
    console.log('\n----- ADVOGADOS DO AUTOR -----');
    if (dadosProcesso.advogadosAutor && dadosProcesso.advogadosAutor.length > 0) {
      dadosProcesso.advogadosAutor.forEach((adv, index) => {
        console.log(`${index + 1}. ${adv}`);
      });
    } else {
      console.log('Nenhum advogado do autor encontrado.');
    }
    
    console.log('\n----- MOVIMENTAÇÕES -----');
    if (dadosProcesso.movimentacoes && dadosProcesso.movimentacoes.length > 0) {
      dadosProcesso.movimentacoes.forEach((mov, index) => {
        console.log(`${index + 1}. [${mov.data}] ${mov.descricao}`);
      });
    } else {
      console.log('Nenhuma movimentação encontrada.');
    }
    
    // Aguardar para visualização manual
    console.log('\nAguardando 180 segundos (3 minutos) para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    
    // Manter o navegador aberto por 3 minutos
    await page.waitForTimeout(180000);
    
    console.log('Extração de dados concluída com sucesso!');
    
  } catch (error) {
    console.error('Erro durante a extração de dados:', error);
    console.error('Stack trace:', error.stack);
    
    // Tirar screenshot em caso de erro
    try {
      if (page) {
        await page.screenshot({ path: './tjal-erro.png' });
        console.log('Screenshot do erro salvo como tjal-erro.png');
        
        // Aguardar um tempo para visualização manual mesmo em caso de erro
        console.log('Aguardando 60 segundos para visualização manual do erro...');
        await page.waitForTimeout(60000);
      }
    } catch (screenshotError) {
      console.error('Erro ao tirar screenshot:', screenshotError);
    }
  } finally {
    // Fechar o navegador
    console.log('Fechando o navegador...');
    if (browser) {
      await browser.close();
      console.log('Navegador fechado com sucesso!');
    }
  }
}

// Executar a extração de dados
extrairDadosTJAL()
  .then(() => {
    console.log('\nScript finalizado.');
  })
  .catch(error => {
    console.error('Erro na execução do script:', error);
  });
