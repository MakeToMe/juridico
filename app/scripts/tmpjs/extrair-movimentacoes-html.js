/**
 * Script para extrair movimentações do TJAL usando parsing direto do HTML
 * Esta abordagem é mais confiável para extrair todas as movimentações
 */

const { chromium } = require('playwright');
const fs = require('fs');

// Número do processo a ser consultado
const NUMERO_PROCESSO = '0727108-89.2024.8.02.0001';

// URL direta do processo
const URL_PROCESSO = `https://www2.tjal.jus.br/cpopg/show.do?processo.codigo=01001NT870000&processo.foro=1&processo.numero=${NUMERO_PROCESSO}`;

// Credenciais para acesso ao TJAL
const credenciais = {
  site: 'https://www2.tjal.jus.br/sajcas/login?service=https%3A%2F%2Fwww2.tjal.jus.br%2Fesaj%2Fj_spring_cas_security_check',
  usuario: '847.698.584-34',
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
 * Função para extrair movimentações do HTML usando regex
 */
function extrairMovimentacoesDoHTML(html) {
  const movimentacoes = [];
  
  // Regex para encontrar tabelas de movimentações
  const regexTabela = /<table[^>]*id=["']?(tabelaTodasMovimentacoes|tabelaUltimasMovimentacoes)["']?[^>]*>([\s\S]*?)<\/table>/gi;
  const matchTabela = regexTabela.exec(html);
  
  if (matchTabela) {
    const conteudoTabela = matchTabela[0];
    
    // Regex para extrair linhas da tabela
    const regexLinhas = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let matchLinha;
    
    while ((matchLinha = regexLinhas.exec(conteudoTabela)) !== null) {
      const conteudoLinha = matchLinha[1];
      
      // Regex para extrair células da linha
      const regexCelulas = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const celulas = [];
      let matchCelula;
      
      while ((matchCelula = regexCelulas.exec(conteudoLinha)) !== null) {
        // Remover tags HTML da célula
        const conteudoCelula = matchCelula[1].replace(/<[^>]*>/g, ' ');
        celulas.push(limparTexto(conteudoCelula));
      }
      
      // Se temos pelo menos duas células (data e descrição)
      if (celulas.length >= 2) {
        const data = celulas[0];
        const descricao = celulas[1];
        
        // Verificar se a primeira célula parece uma data (DD/MM/AAAA)
        if (data.match(/\d{2}\/\d{2}\/\d{4}/)) {
          movimentacoes.push({ data, descricao });
        }
      }
    }
  }
  
  // Se não encontrou movimentações na tabela, tentar outra abordagem
  if (movimentacoes.length === 0) {
    // Regex mais genérica para encontrar padrões de data seguidos por descrição
    const regexMovimentacao = /<td[^>]*>(\d{2}\/\d{2}\/\d{4})<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
    let match;
    
    while ((match = regexMovimentacao.exec(html)) !== null) {
      const data = match[1].trim();
      // Limpar a descrição (remover tags HTML e espaços extras)
      let descricao = match[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      if (data && descricao) {
        movimentacoes.push({ data, descricao });
      }
    }
  }
  
  return movimentacoes;
}

/**
 * Função principal para extrair movimentações de um processo no TJAL
 */
async function extrairMovimentacoesTJAL() {
  console.log(`Iniciando extração de movimentações do processo ${NUMERO_PROCESSO} no TJAL...`);
  
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
    
    // ETAPA 3: EXTRAIR MOVIMENTAÇÕES DO PROCESSO
    console.log('\n=== ETAPA 3: EXTRAINDO MOVIMENTAÇÕES DO PROCESSO ===');
    
    // Aguardar um pouco para garantir que todos os elementos estejam carregados
    console.log('Aguardando 5 segundos para garantir carregamento completo da página...');
    await page.waitForTimeout(5000);
    
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
    
    // Obter o HTML completo da página
    const htmlCompleto = await page.content();
    
    // Salvar o HTML para análise
    fs.writeFileSync('pagina-processo.html', htmlCompleto);
    console.log('HTML da página salvo em pagina-processo.html');
    
    // Extrair movimentações do HTML
    console.log('Extraindo movimentações do HTML...');
    const movimentacoes = extrairMovimentacoesDoHTML(htmlCompleto);
    
    // Exibir as movimentações encontradas
    console.log('\n===== MOVIMENTAÇÕES ENCONTRADAS =====');
    if (movimentacoes && movimentacoes.length > 0) {
      console.log(JSON.stringify(movimentacoes, null, 2));
      
      console.log(`\n----- TOTAL DE MOVIMENTAÇÕES: ${movimentacoes.length} -----`);
      movimentacoes.forEach((mov, index) => {
        console.log(`${index + 1}. [${mov.data}] ${mov.descricao}`);
      });
      
      // Salvar as movimentações em um arquivo JSON
      fs.writeFileSync('movimentacoes.json', JSON.stringify(movimentacoes, null, 2));
      console.log('Movimentações salvas em movimentacoes.json');
    } else {
      console.log('Nenhuma movimentação encontrada.');
    }
    
    // Tentar extrair movimentações diretamente do DOM
    console.log('\nTentando extrair movimentações diretamente do DOM...');
    
    const movimentacoesDOM = await page.evaluate(() => {
      const resultado = [];
      
      // Função para limpar texto
      function limparTexto(texto) {
        if (!texto) return '';
        return texto.replace(/\s+/g, ' ').trim();
      }
      
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
      
      return resultado;
    });
    
    // Exibir as movimentações encontradas diretamente do DOM
    if (movimentacoesDOM && movimentacoesDOM.length > 0) {
      console.log('\n===== MOVIMENTAÇÕES ENCONTRADAS DO DOM =====');
      console.log(JSON.stringify(movimentacoesDOM, null, 2));
      
      console.log(`\n----- TOTAL DE MOVIMENTAÇÕES (DOM): ${movimentacoesDOM.length} -----`);
      movimentacoesDOM.forEach((mov, index) => {
        console.log(`${index + 1}. [${mov.data}] ${mov.descricao}`);
      });
    }
    
    // Combinar os resultados (remover duplicatas)
    const todasMovimentacoes = [...movimentacoes];
    
    // Adicionar movimentações encontradas do DOM que não estão no primeiro conjunto
    for (const movDOM of movimentacoesDOM) {
      const jaExiste = todasMovimentacoes.some(
        mov => mov.data === movDOM.data && mov.descricao === movDOM.descricao
      );
      
      if (!jaExiste) {
        todasMovimentacoes.push(movDOM);
      }
    }
    
    // Ordenar por data (mais recente primeiro)
    todasMovimentacoes.sort((a, b) => {
      const dataA = a.data.split('/').reverse().join('');
      const dataB = b.data.split('/').reverse().join('');
      return dataB.localeCompare(dataA);
    });
    
    // Exibir todas as movimentações encontradas
    console.log('\n===== TODAS AS MOVIMENTAÇÕES ENCONTRADAS =====');
    console.log(JSON.stringify(todasMovimentacoes, null, 2));
    
    console.log(`\n----- TOTAL DE MOVIMENTAÇÕES COMBINADAS: ${todasMovimentacoes.length} -----`);
    todasMovimentacoes.forEach((mov, index) => {
      console.log(`${index + 1}. [${mov.data}] ${mov.descricao}`);
    });
    
    // Aguardar para visualização manual
    console.log('\nAguardando 180 segundos (3 minutos) para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    
    // Manter o navegador aberto por 3 minutos
    await page.waitForTimeout(180000);
    
    console.log('Extração de movimentações concluída com sucesso!');
    
    return todasMovimentacoes;
    
  } catch (error) {
    console.error('Erro durante a extração de movimentações:', error);
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

// Executar a extração de movimentações
extrairMovimentacoesTJAL()
  .then(movimentacoes => {
    console.log('\nScript finalizado com sucesso.');
    
    // Salvar as movimentações em um arquivo JSON para referência
    fs.writeFileSync('movimentacoes-final.json', JSON.stringify(movimentacoes, null, 2));
    console.log('Movimentações salvas em movimentacoes-final.json');
  })
  .catch(error => {
    console.error('Erro na execução do script:', error);
  });
