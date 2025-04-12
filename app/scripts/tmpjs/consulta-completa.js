/**
 * Script completo para realizar login e consultar um processo no TJAL
 * Combina as funcionalidades de login e consulta com os seletores corretos
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

async function consultaProcessoCompleta() {
  console.log(`Iniciando consulta completa do processo ${NUMERO_PROCESSO}...`);
  
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
    
    // ETAPA 1: LOGIN
    console.log('\n=== ETAPA 1: REALIZANDO LOGIN ===');
    
    // Navegar para a página de login
    console.log('Navegando para a página de login...');
    await page.goto(credenciais.site, { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    // Verificar se o formulário de login está presente
    console.log('Verificando formulário de login...');
    await page.waitForSelector('#usernameForm', { timeout: 30000 });
    
    // Preencher credenciais
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', credenciais.usuario);
    await page.fill('#passwordForm', credenciais.senha);
    
    // Tirar screenshot antes do login
    await page.screenshot({ path: './login-antes.png' });
    
    // Clicar no botão de login
    console.log('Clicando no botão de login...');
    await Promise.all([
      page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle' }),
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
    await page.screenshot({ path: './login-sucesso.png' });
    
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
    
    // Extrair informações básicas
    const dadosProcesso = await page.evaluate(() => {
      // Função para extrair texto de um elemento
      const extrairTexto = (seletor) => {
        const elemento = document.querySelector(seletor);
        return elemento ? elemento.textContent.trim() : null;
      };
      
      // Extrair dados básicos
      const numeroProcesso = extrairTexto('.espacamentoLinhas');
      const classe = extrairTexto('span[id*="classeProcesso"]');
      const assunto = extrairTexto('span[id*="assuntoProcesso"]');
      const distribuicao = extrairTexto('div:has(> span:contains("Distribuição")) + div');
      const juiz = extrairTexto('span[id*="juizProcesso"]');
      const valorAcao = extrairTexto('div:has(> span:contains("Valor da ação")) + div');
      
      // Extrair partes do processo
      const partes = [];
      const secaoPartes = document.querySelectorAll('table.secaoFormBody > tbody > tr');
      secaoPartes.forEach(linha => {
        const colunas = linha.querySelectorAll('td');
        if (colunas.length >= 2) {
          const tipo = colunas[0].textContent.trim();
          const nome = colunas[1].textContent.trim();
          if (tipo && nome) {
            partes.push({ tipo, nome });
          }
        }
      });
      
      // Extrair movimentações
      const movimentacoes = [];
      const tabelaMovimentacoes = document.querySelector('table#tabelaTodasMovimentacoes');
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
    console.log('\nAguardando 180 segundos (3 minutos) para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    await new Promise(resolve => setTimeout(resolve, 180000));
    
    console.log('Consulta completa realizada com sucesso!');
    
  } catch (error) {
    console.error('Erro durante a consulta completa:', error);
  } finally {
    // Fechar o navegador
    console.log('Fechando o navegador...');
    await browser.close();
    console.log('Navegador fechado com sucesso!');
  }
}

// Executar a consulta completa
consultaProcessoCompleta();
