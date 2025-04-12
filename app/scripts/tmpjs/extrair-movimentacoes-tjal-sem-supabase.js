/**
 * Script para extrair movimentações de um processo no TJAL
 * sem salvar no Supabase, apenas extraindo os dados e salvando em JSON
 */

const { chromium } = require('playwright');
const fs = require('fs');

// Número do processo a ser consultado
const NUMERO_PROCESSO = '0727108-89.2024.8.02.0001';

// URL direta para o processo
const URL_PROCESSO = `https://www2.tjal.jus.br/cpopg/show.do?processo.numero=${NUMERO_PROCESSO}&processo.foro=1`;

// Credenciais para acesso ao TJAL
const credenciais = {
  site: 'https://www2.tjal.jus.br/sajcas/login?service=https%3A%2F%2Fwww2.tjal.jus.br%2Fesaj%2Fj_spring_cas_security_check',
  usuario: '84769858434',
  senha: '8476guardia'
};

/**
 * Função para limpar texto (remover espaços extras, quebras de linha, etc.)
 */
function limparTexto(texto) {
  if (!texto) return '';
  return texto.replace(/\s+/g, ' ').trim();
}

/**
 * Função para extrair dados do processo
 */
async function extrairDadosProcesso(page) {
  // Função auxiliar para extrair texto de um seletor
  const extrairTexto = async (seletor) => {
    const elemento = await page.$(seletor);
    if (elemento) {
      const texto = await elemento.textContent();
      return limparTexto(texto);
    }
    return '';
  };
  
  // Extrair dados básicos do processo
  const numeroProcesso = await extrairTexto('#numeroProcesso');
  const classeProcesso = await extrairTexto('#classeProcesso');
  const assuntoProcesso = await extrairTexto('#assuntoProcesso');
  const dataDistribuicao = await extrairTexto('#dataDistribuicao');
  const juiz = await extrairTexto('#juiz');
  const valorAcao = await extrairTexto('#valorAcao');
  
  // Extrair partes do processo
  const partes = [];
  
  // Buscar todas as tabelas de partes
  const tabelasPartes = await page.$$('table.secaoFormBody');
  
  for (const tabela of tabelasPartes) {
    // Verificar se é uma tabela de partes
    const titulo = await tabela.$('tr.fundoClaro th, tr.fundoEscuro th');
    if (!titulo) continue;
    
    const textoTitulo = await titulo.textContent();
    if (!textoTitulo.includes('Parte') && !textoTitulo.includes('Advogado')) continue;
    
    // Extrair informações das partes
    const linhas = await tabela.$$('tr:not(.fundoClaro):not(.fundoEscuro)');
    
    for (const linha of linhas) {
      const colunas = await linha.$$('td');
      
      if (colunas.length >= 2) {
        const tipo = await colunas[0].textContent();
        const nome = await colunas[1].textContent();
        
        partes.push({
          tipo: limparTexto(tipo),
          nome: limparTexto(nome)
        });
      }
    }
  }
  
  return {
    numeroProcesso,
    classeProcesso,
    assuntoProcesso,
    dataDistribuicao,
    juiz,
    valorAcao,
    partes
  };
}

/**
 * Função para limpar e processar as movimentações
 */
function processarMovimentacoes(movimentacoes) {
  // Remover duplicatas (mesma data e descrição)
  const movimentacoesUnicas = [];
  const chaves = new Set();
  
  movimentacoes.forEach(mov => {
    const chave = `${mov.data}|${mov.descricao}`;
    
    if (!chaves.has(chave)) {
      chaves.add(chave);
      movimentacoesUnicas.push(mov);
    }
  });
  
  // Ordenar por data (mais recente primeiro)
  const movimentacoesOrdenadas = movimentacoesUnicas.sort((a, b) => {
    const dataA = a.data.split('/').reverse().join('-');
    const dataB = b.data.split('/').reverse().join('-');
    return dataB.localeCompare(dataA);
  });
  
  return movimentacoesOrdenadas;
}

/**
 * Função principal para extrair movimentações de um processo no TJAL
 */
async function extrairMovimentacoesTJAL() {
  console.log(`Iniciando extração de movimentações do processo ${NUMERO_PROCESSO} no TJAL...`);
  
  const browser = await chromium.launch({
    headless: false,  // Modo não-headless para visualização
    slowMo: 100  // Adicionar um pequeno atraso para visualização
  });
  
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    // ETAPA 1: FAZER LOGIN NO SISTEMA
    console.log('\n=== ETAPA 1: FAZENDO LOGIN NO SISTEMA ===');
    
    // Navegar para a página de login
    console.log('Navegando para a página de login...');
    await page.goto(credenciais.site, { timeout: 60000 });
    
    // Preencher credenciais
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', credenciais.usuario);
    await page.fill('#passwordForm', credenciais.senha);
    await page.click('#pbEntrar');
    
    // Aguardar redirecionamento após login
    console.log('Aguardando redirecionamento após login...');
    
    try {
      await page.waitForNavigation({ timeout: 30000 });
    } catch (error) {
      console.log('Timeout ao aguardar navegação após login, verificando URL atual...');
    }
    
    // Verificar URL após login
    const urlAposLogin = page.url();
    console.log(`URL após tentativa de login: ${urlAposLogin}`);
    
    if (!(urlAposLogin.includes('esaj') || urlAposLogin.includes('cpopg'))) {
      throw new Error('Redirecionamento após login não ocorreu como esperado');
    }
    
    console.log('Login realizado com sucesso!');
    
    // ETAPA 2: ACESSAR DIRETAMENTE A PÁGINA DO PROCESSO
    console.log('\n=== ETAPA 2: ACESSANDO PÁGINA DO PROCESSO ===');
    
    console.log(`Navegando para a URL direta do processo: ${URL_PROCESSO}`);
    await page.goto(URL_PROCESSO, { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
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
    
    // Extrair dados básicos do processo
    console.log('Extraindo dados básicos do processo...');
    const dadosProcesso = await extrairDadosProcesso(page);
    
    console.log('\n===== DADOS DO PROCESSO =====');
    console.log(JSON.stringify(dadosProcesso, null, 2));
    
    // ETAPA 4: EXTRAIR MOVIMENTAÇÕES DO PROCESSO
    console.log('\n=== ETAPA 4: EXTRAINDO MOVIMENTAÇÕES DO PROCESSO ===');
    
    // Verificar se há botão para expandir todas as movimentações
    console.log('Verificando se há botão para expandir todas as movimentações...');
    
    // Tirar screenshot antes de expandir
    await page.screenshot({ path: './antes-expandir.png' });
    
    // Tentar clicar no botão para mostrar todas as movimentações
    const botaoTodasMovimentacoes = await page.$('#linkMovimentacoes, #todasMovimentacoes');
    if (botaoTodasMovimentacoes) {
      console.log('Encontrado botão para expandir todas as movimentações, clicando...');
      await botaoTodasMovimentacoes.click();
      console.log('Aguardando 3 segundos para carregar todas as movimentações...');
      await page.waitForTimeout(3000);
    }
    
    // Tirar screenshot da página completa para análise
    await page.screenshot({ path: './pagina-completa.png', fullPage: true });
    
    // Extrair movimentações diretamente do DOM usando o seletor tr.containerMovimentacao
    console.log('Extraindo movimentações diretamente do DOM usando o seletor tr.containerMovimentacao...');
    
    const movimentacoesDOM = await page.evaluate(() => {
      const resultado = [];
      
      // Função para limpar texto
      function limparTexto(texto) {
        if (!texto) return '';
        return texto.replace(/\s+/g, ' ').trim();
      }
      
      // Usar o seletor específico tr.containerMovimentacao
      console.log('Buscando movimentações com o seletor tr.containerMovimentacao...');
      
      const movimentacoes = Array.from(document.querySelectorAll('tr.containerMovimentacao')).map(row => {
        const colunas = row.querySelectorAll('td');
        const data = colunas[0]?.innerText.trim() || '';
        const descricao = colunas[1]?.innerText.trim() || '';
        
        return {
          data,
          descricao: limparTexto(descricao)
        };
      });
      
      console.log(`Encontradas ${movimentacoes.length} movimentações com o seletor específico.`);
      resultado.push(...movimentacoes);
      
      // Se não encontramos nada com o seletor específico, tentar abordagem alternativa
      if (resultado.length === 0) {
        console.log('Nenhuma movimentação encontrada com o seletor específico, tentando abordagem alternativa...');
        
        // Buscar todas as tabelas
        const tabelas = document.querySelectorAll('table');
        
        tabelas.forEach(tabela => {
          // Verificar se a tabela tem linhas
          const linhas = tabela.querySelectorAll('tr');
          
          linhas.forEach(linha => {
            const colunas = linha.querySelectorAll('td');
            
            if (colunas.length >= 2) {
              const data = colunas[0].textContent.trim();
              const descricao = colunas[1].textContent.trim();
              
              // Verificar se a primeira coluna parece uma data
              if (data.match(/\d{2}\/\d{2}\/\d{4}/)) {
                resultado.push({
                  data,
                  descricao: limparTexto(descricao)
                });
              }
            }
          });
        });
      }
      
      return resultado;
    });
    
    // Processar movimentações para remover duplicatas
    const movimentacoesProcessadas = processarMovimentacoes(movimentacoesDOM);
    
    // Exibir as movimentações processadas
    console.log('\n===== MOVIMENTAÇÕES PROCESSADAS =====');
    console.log(JSON.stringify(movimentacoesProcessadas, null, 2));
    
    console.log(`\n----- TOTAL DE MOVIMENTAÇÕES: ${movimentacoesProcessadas.length} -----`);
    movimentacoesProcessadas.forEach((mov, index) => {
      console.log(`${index + 1}. [${mov.data}] ${mov.descricao || '(sem descrição)'}`);
    });
    
    // Salvar as movimentações em um arquivo JSON para referência
    fs.writeFileSync('movimentacoes-extraidas.json', JSON.stringify({
      dadosProcesso,
      movimentacoes: movimentacoesProcessadas
    }, null, 2));
    console.log('\nDados salvos em movimentacoes-extraidas.json');
    
    // Aguardar para visualização manual
    console.log('\nAguardando 60 segundos (1 minuto) para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    
    // Manter o navegador aberto por 1 minuto
    await page.waitForTimeout(60000);
    
    console.log('Extração de movimentações concluída com sucesso!');
    
    return {
      dadosProcesso,
      movimentacoes: movimentacoesProcessadas
    };
    
  } catch (error) {
    console.error('Erro durante a extração de movimentações:', error);
    console.error('Stack trace:', error.stack);
    
    // Tirar screenshot em caso de erro
    try {
      if (page) {
        await page.screenshot({ path: './tjal-erro.png' });
        console.log('Screenshot do erro salvo como tjal-erro.png');
        
        // Aguardar um tempo para visualização manual mesmo em caso de erro
        console.log('Aguardando 30 segundos para visualização manual do erro...');
        await page.waitForTimeout(30000);
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

// Executar a extração de movimentações
extrairMovimentacoesTJAL()
  .then(resultado => {
    console.log('\nScript finalizado com sucesso.');
    
    if (resultado) {
      console.log(`Processo ${resultado.dadosProcesso.numeroProcesso} extraído com sucesso.`);
      console.log(`Total de movimentações: ${resultado.movimentacoes.length}`);
    }
  })
  .catch(error => {
    console.error('Erro na execução do script:', error);
  });
