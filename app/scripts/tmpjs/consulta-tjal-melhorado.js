/**
 * Script melhorado para realizar login e consultar um processo no TJAL
 * Com tempo de espera maior para visualização e tratamento de erros aprimorado
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

async function consultaProcessoTJAL() {
  console.log(`Iniciando consulta do processo ${NUMERO_PROCESSO} no TJAL...`);
  
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
      if (msg.type() === 'error') {
        console.log(`[Página] Erro: ${msg.text()}`);
      }
    });
    
    const page = await context.newPage();
    
    // ETAPA 1: LOGIN NO SISTEMA
    console.log('\n=== ETAPA 1: REALIZANDO LOGIN ===');
    
    console.log('Navegando para a página de login...');
    await page.goto(credenciais.site, { 
      timeout: 60000, 
      waitUntil: 'networkidle' 
    });
    
    console.log('Verificando formulário de login...');
    await page.waitForSelector('#usernameForm', { timeout: 30000 });
    
    // Tirar screenshot da página de login
    await page.screenshot({ path: './tjal-login-page.png' });
    
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', credenciais.usuario);
    await page.fill('#passwordForm', credenciais.senha);
    
    console.log('Clicando no botão de login...');
    await Promise.all([
      page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle' }),
      page.click('#pbEntrar')
    ]);
    
    // Verificar se o login foi bem-sucedido
    const urlAposLogin = page.url();
    console.log(`URL após login: ${urlAposLogin}`);
    
    if (!urlAposLogin.includes('tjal.jus.br')) {
      throw new Error('Login não foi bem-sucedido');
    }
    
    console.log('Login realizado com sucesso!');
    await page.screenshot({ path: './tjal-apos-login.png' });
    
    // ETAPA 2: CONSULTAR PROCESSO
    console.log('\n=== ETAPA 2: CONSULTANDO PROCESSO ===');
    
    // Navegar para a página de consulta processual
    console.log('Navegando para a página de consulta processual...');
    await page.goto('https://www2.tjal.jus.br/cpopg/open.do', {
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    // Tirar screenshot da página de consulta
    await page.screenshot({ path: './tjal-pagina-consulta.png' });
    
    // Selecionar a opção "Unificado"
    console.log('Selecionando a opção "Unificado"...');
    await page.click('#radioNumeroAntigo2');
    
    // Preencher o número do processo
    console.log(`Preenchendo o número do processo: ${NUMERO_PROCESSO}...`);
    
    // Separar o número do processo em suas partes
    const partes = NUMERO_PROCESSO.split('.');
    const numeroDigitos = partes[0].split('-');
    
    // Preencher os campos do número do processo
    await page.fill('#numeroDigitoAnoUnificado', numeroDigitos[0]);
    await page.fill('#foroNumeroUnificado', partes[3]);
    
    // Tirar screenshot após preencher
    await page.screenshot({ path: './tjal-apos-preencher.png' });
    
    // Clicar no botão de consulta
    console.log('Clicando no botão de consulta...');
    await Promise.all([
      page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle' }),
      page.click('#pbConsultar')
    ]);
    
    // Tirar screenshot dos resultados
    await page.screenshot({ path: './tjal-resultados.png' });
    
    // ETAPA 3: EXTRAIR DADOS DO PROCESSO
    console.log('\n=== ETAPA 3: EXTRAINDO DADOS DO PROCESSO ===');
    
    // Verificar se estamos na página de detalhes do processo
    const tituloPagina = await page.title();
    console.log(`Título da página: ${tituloPagina}`);
    
    if (!tituloPagina.includes('Processo') && !tituloPagina.includes('TJAL')) {
      throw new Error('Não foi possível acessar os detalhes do processo');
    }
    
    // Extrair dados do processo usando JavaScript
    console.log('Extraindo dados do processo...');
    const dadosProcesso = await page.evaluate(() => {
      // Função para extrair texto de um seletor, retornando string vazia se não encontrar
      function extrairTexto(seletor) {
        const elemento = document.querySelector(seletor);
        return elemento ? elemento.textContent.trim() : '';
      }
      
      // Extrair dados básicos do processo
      const numeroProcesso = extrairTexto('#numeroProcesso');
      const classe = extrairTexto('#classeProcesso');
      const assunto = extrairTexto('#assuntoProcesso');
      const distribuicao = extrairTexto('#dataDistribuicaoProcesso');
      const juiz = extrairTexto('#juizProcesso');
      const valorAcao = extrairTexto('#valorAcaoProcesso');
      
      // Extrair partes do processo
      const partes = [];
      const tabelaPartes = document.querySelector('#tablePartesPrincipais');
      
      if (tabelaPartes) {
        const linhas = tabelaPartes.querySelectorAll('tr');
        
        linhas.forEach(linha => {
          const colunas = linha.querySelectorAll('td');
          
          if (colunas.length >= 2) {
            const tipo = colunas[0].textContent.trim();
            const nome = colunas[1].textContent.trim();
            
            if (tipo && nome) {
              partes.push({ tipo, nome });
            }
          }
        });
      }
      
      // Extrair movimentações do processo
      const movimentacoes = [];
      const tabelaMovimentacoes = document.querySelector('#tabelaTodasMovimentacoes');
      
      if (tabelaMovimentacoes) {
        const linhas = tabelaMovimentacoes.querySelectorAll('tr');
        
        linhas.forEach(linha => {
          const colunas = linha.querySelectorAll('td');
          
          if (colunas.length >= 2) {
            const data = colunas[0].textContent.trim();
            const descricao = colunas[1].textContent.trim();
            
            if (data && descricao) {
              movimentacoes.push({ data, descricao });
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
        partes,
        movimentacoes
      };
    });
    
    // Exibir os dados extraídos
    console.log('\n===== RESULTADO DA CONSULTA =====');
    console.log('\n----- DADOS DO PROCESSO -----');
    console.log(`Número: ${dadosProcesso.numeroProcesso}`);
    console.log(`Classe: ${dadosProcesso.classe}`);
    console.log(`Assunto: ${dadosProcesso.assunto}`);
    console.log(`Distribuição: ${dadosProcesso.distribuicao}`);
    console.log(`Juiz: ${dadosProcesso.juiz}`);
    console.log(`Valor da Ação: ${dadosProcesso.valorAcao}`);
    
    console.log('\n----- PARTES DO PROCESSO -----');
    if (dadosProcesso.partes && dadosProcesso.partes.length > 0) {
      dadosProcesso.partes.forEach((parte, index) => {
        console.log(`${index + 1}. ${parte.tipo}: ${parte.nome}`);
      });
    } else {
      console.log('Nenhuma parte encontrada.');
    }
    
    console.log('\n----- MOVIMENTAÇÕES -----');
    if (dadosProcesso.movimentacoes && dadosProcesso.movimentacoes.length > 0) {
      const movimentacoesExibidas = dadosProcesso.movimentacoes.slice(0, 5);
      movimentacoesExibidas.forEach((mov, index) => {
        console.log(`${index + 1}. [${mov.data}] ${mov.descricao}`);
      });
      
      if (dadosProcesso.movimentacoes.length > 5) {
        console.log(`... mais ${dadosProcesso.movimentacoes.length - 5} movimentações`);
      }
    } else {
      console.log('Nenhuma movimentação encontrada.');
    }
    
    console.log('\n===== FIM DO RESULTADO =====');
    
    // Aguardar para visualização manual
    console.log('\nAguardando 120 segundos (2 minutos) para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    
    // Manter o navegador aberto por 2 minutos
    await new Promise(resolve => setTimeout(resolve, 120000));
    
    console.log('Consulta completa realizada com sucesso!');
    
  } catch (error) {
    console.error('Erro durante a consulta:', error);
    
    // Tirar screenshot em caso de erro
    try {
      if (page) {
        await page.screenshot({ path: './tjal-erro.png' });
        console.log('Screenshot do erro salvo como tjal-erro.png');
      }
    } catch (screenshotError) {
      console.error('Erro ao tirar screenshot:', screenshotError);
    }
  } finally {
    // Fechar o navegador
    console.log('Fechando o navegador...');
    await browser.close();
    console.log('Navegador fechado com sucesso!');
  }
}

// Executar a consulta
consultaProcessoTJAL();
