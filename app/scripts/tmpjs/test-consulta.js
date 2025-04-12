/**
 * Script de teste para consultar um processo específico no TJAL
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

async function testarConsultaProcesso() {
  console.log(`Iniciando teste de consulta do processo ${NUMERO_PROCESSO}...`);
  
  let browser = null;
  
  try {
    // Iniciar o navegador
    console.log('Iniciando navegador...');
    browser = await chromium.launch({
      headless: false, // Definir como false para visualizar o navegador
      args: ['--disable-dev-shm-usage'],
      timeout: 60000, // Aumentar timeout para 60 segundos
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      acceptDownloads: true,
      ignoreHTTPSErrors: true,
    });
    
    const page = await context.newPage();
    console.log('Navegador iniciado com sucesso!');
    
    // Realizar login
    console.log('Navegando para a página de login...');
    await page.goto(credenciais.site, { timeout: 60000, waitUntil: 'networkidle' });
    
    console.log('Verificando se o formulário de login está presente...');
    await page.waitForSelector('#usernameForm', { timeout: 30000 });
    
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', credenciais.usuario);
    await page.fill('#passwordForm', credenciais.senha);
    
    console.log('Clicando no botão de login...');
    await Promise.all([
      page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle' }),
      page.click('#pbEntrar')
    ]);
    
    console.log('Verificando resultado do login...');
    const url = page.url();
    console.log(`URL após login: ${url}`);
    
    // Verificar se há algum elemento que indique erro de login
    const erroLogin = await page.$('.alert-danger');
    if (erroLogin) {
      const mensagemErro = await erroLogin.textContent();
      throw new Error(`Erro de login: ${mensagemErro || 'Credenciais inválidas'}`);
    }
    
    // Consultar o processo
    console.log(`Consultando processo ${NUMERO_PROCESSO}...`);
    
    console.log('Navegando para a página de consulta...');
    await page.goto('https://www2.tjal.jus.br/cpopg/search.do', { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    console.log('Aguardando carregamento do formulário de consulta...');
    await page.waitForSelector('input[name="numeroDigitoAnoUnificado"]', { timeout: 30000 });
    
    // Extrair as partes do número do processo
    // Formato: 0727108-89.2024.8.02.0001
    const numeroSemPontos = NUMERO_PROCESSO.replace(/[^0-9]/g, ''); // Remove todos os caracteres não numéricos
    
    // Dividir o número nas partes necessárias para o formulário
    // Formato original: 0727108-89.2024.8.02.0001
    const parte1 = numeroSemPontos.substring(0, 7);    // 0727108
    const parte2 = numeroSemPontos.substring(7, 9);    // 89
    const parte3 = numeroSemPontos.substring(9, 13);   // 2024
    const parte4 = '0001';  // Hardcoded para garantir o valor correto
    
    console.log('Preenchendo os campos do formulário...');
    console.log(`Partes do número: ${parte1}-${parte2}.${parte3}.8.02.${parte4}`);
    
    // Usar JavaScript para preencher os campos diretamente
    await page.evaluate(() => {
      // Limpar os campos primeiro
      document.querySelector('input[name="numeroDigitoAnoUnificado"]').value = '';
      document.querySelector('input[name="foroNumeroUnificado"]').value = '';
      
      // Preencher com os valores corretos
      document.querySelector('input[name="numeroDigitoAnoUnificado"]').value = '0727108-89.2024';
      document.querySelector('input[name="foroNumeroUnificado"]').value = '0001';
      
      // Garantir que o radio button "Unificado" esteja selecionado
      document.querySelector('input[type="radio"][name="tipoCriterioUnificado"][value="U"]').checked = true;
      
      // Retornar os valores para verificar
      return {
        parte1: document.querySelector('input[name="numeroDigitoAnoUnificado"]').value,
        parte2: document.querySelector('input[name="foroNumeroUnificado"]').value
      };
    }).then(result => {
      console.log(`Valores preenchidos via JS: ${result.parte1} e ${result.parte2}`);
    });
    
    // Verificar se os campos foram preenchidos corretamente
    const valorDigitado1 = await page.inputValue('input[name="numeroDigitoAnoUnificado"]');
    const valorDigitado2 = await page.inputValue('input[name="foroNumeroUnificado"]');
    console.log(`Valores verificados: ${valorDigitado1} e ${valorDigitado2}`);
    
    console.log('Tentando clicar no botão de consultar...');
    try {
      // Tirar screenshot antes de clicar
      await page.screenshot({ path: './antes-consulta.png' });
      console.log('Screenshot antes de clicar salvo como antes-consulta.png');
      
      // Aguardar um momento para garantir que tudo está carregado
      await page.waitForTimeout(2000);
      
      // Abordagem simplificada: Usar JavaScript para identificar e clicar no botão
      console.log('Usando JavaScript para identificar e clicar no botão Consultar...');
      
      const resultado = await page.evaluate(() => {
        // Registrar informações sobre os botões para debug
        const botoes = document.querySelectorAll('input[type="submit"]');
        console.log(`Encontrados ${botoes.length} botões de submit`);
        
        // Registrar informações sobre cada botão
        const infoBotoes = [];
        botoes.forEach((b, i) => {
          infoBotoes.push({
            indice: i,
            valor: b.value,
            id: b.id,
            classe: b.className,
            tipo: b.type,
            visivel: b.offsetParent !== null
          });
        });
        
        // Registrar informações sobre os formulários
        const forms = document.querySelectorAll('form');
        console.log(`Encontrados ${forms.length} formulários`);
        
        const infoForms = [];
        forms.forEach((f, i) => {
          infoForms.push({
            indice: i,
            id: f.id,
            nome: f.name,
            acao: f.action
          });
        });
        
        // Tentar encontrar o botão Consultar
        const botaoConsultar = Array.from(botoes).find(b => b.value === 'Consultar');
        if (botaoConsultar) {
          console.log('Botão Consultar encontrado, clicando...');
          botaoConsultar.click();
          return { sucesso: true, infoBotoes, infoForms };
        }
        
        // Se não encontrar o botão, tentar submeter o formulário
        if (forms.length > 0) {
          console.log('Submetendo o formulário diretamente...');
          forms[0].submit();
          return { sucesso: true, metodo: 'submit', infoBotoes, infoForms };
        }
        
        return { sucesso: false, infoBotoes, infoForms };
      });
      
      console.log('Resultado da operação:', resultado.sucesso ? 'Sucesso' : 'Falha');
      console.log('Informações dos botões:', JSON.stringify(resultado.infoBotoes, null, 2));
      console.log('Informações dos formulários:', JSON.stringify(resultado.infoForms, null, 2));
      
      // Aguardar a navegação após o clique
      console.log('Aguardando navegação após o clique...');
      try {
        await page.waitForNavigation({ timeout: 30000 });
        console.log('Navegação concluída após clicar em consultar');
      } catch (navError) {
        console.log('Timeout na navegação, mas continuando...', navError.message);
      }
    } catch (error) {
      console.log('Erro ao interagir com o botão ou aguardar navegação:', error.message);
      console.log('Tentando continuar mesmo com o erro...');
      
      // Tirar screenshot para debug
      await page.screenshot({ path: './erro-consulta.png' });
      console.log('Screenshot do erro salvo como erro-consulta.png');
      
      // Aguardar um pouco para ver se a página carrega mesmo sem detectar a navegação
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    console.log('Verificando resultado da consulta...');
    
    // Verificar se o processo foi encontrado
    const mensagemErro = await page.$('.mensagemErro');
    if (mensagemErro) {
      const textoErro = await mensagemErro.textContent();
      console.log(`Processo não encontrado: ${textoErro}`);
      return;
    }
    
    // Verificar se estamos na página de detalhes do processo
    const cabecalhoProcesso = await page.$('.cabecalhoProcesso');
    if (!cabecalhoProcesso) {
      console.log('Página de detalhes do processo não carregada corretamente');
      return;
    }
    
    console.log('Processo encontrado com sucesso!');
    
    // Extrair dados básicos do processo
    console.log('Extraindo dados do processo...');
    
    // Extrair número do processo
    const numeroProcessoElement = await page.$('#numeroProcesso');
    const numeroProcessoText = await numeroProcessoElement?.textContent() || 'Não encontrado';
    
    // Extrair classe
    const classeElement = await page.$('#classeProcesso');
    const classeText = await classeElement?.textContent() || 'Não encontrado';
    
    // Extrair assunto
    const assuntoElement = await page.$('#assuntoProcesso');
    const assuntoText = await assuntoElement?.textContent() || 'Não encontrado';
    
    // Extrair distribuição
    const distribuicaoElement = await page.$('#dataHoraDistribuicaoProcesso');
    const distribuicaoText = await distribuicaoElement?.textContent() || 'Não encontrado';
    
    // Extrair juiz
    const juizElement = await page.$('#juizProcesso');
    const juizText = await juizElement?.textContent() || 'Não encontrado';
    
    // Extrair valor da ação
    const valorAcaoElement = await page.$('#valorAcaoProcesso');
    const valorAcaoText = await valorAcaoElement?.textContent() || 'Não encontrado';
    
    // Extrair partes do processo
    const partes = await page.$$eval('table.secaoFormBody tr.fundoClaro', (rows) => {
      return rows.map(row => {
        const tipo = row.querySelector('td:nth-child(1)')?.textContent?.trim();
        const nome = row.querySelector('td:nth-child(2)')?.textContent?.trim();
        return { tipo, nome };
      });
    });
    
    // Extrair movimentações do processo
    const movimentacoes = await page.$$eval('table#tabelaTodasMovimentacoes tr:not(.fundoClaro)', (rows) => {
      return rows.map(row => {
        const data = row.querySelector('td.dataMovimentacao')?.textContent?.trim();
        const descricao = row.querySelector('td.descricaoMovimentacao')?.textContent?.trim();
        return { data, descricao };
      });
    });
    
    // Exibir o resultado
    console.log('\n===== RESULTADO DA CONSULTA =====');
    console.log('\n----- DADOS DO PROCESSO -----');
    console.log(`Número: ${numeroProcessoText}`);
    console.log(`Classe: ${classeText}`);
    console.log(`Assunto: ${assuntoText}`);
    console.log(`Distribuição: ${distribuicaoText}`);
    console.log(`Juiz: ${juizText}`);
    console.log(`Valor da Ação: ${valorAcaoText}`);
    
    console.log('\n----- PARTES DO PROCESSO -----');
    if (partes && partes.length > 0) {
      partes.forEach((parte, index) => {
        console.log(`${index + 1}. ${parte.tipo}: ${parte.nome}`);
      });
    } else {
      console.log('Nenhuma parte encontrada.');
    }
    
    console.log('\n----- MOVIMENTAÇÕES -----');
    if (movimentacoes && movimentacoes.length > 0) {
      movimentacoes.slice(0, 5).forEach((mov, index) => {
        console.log(`${index + 1}. [${mov.data}] ${mov.descricao}`);
      });
      console.log(`... mais ${movimentacoes.length - 5} movimentações`);
    } else {
      console.log('Nenhuma movimentação encontrada.');
    }
    
    console.log('\n===== FIM DO RESULTADO =====');
    
    // Tirar um screenshot da página
    console.log('Tirando screenshot da página...');
    await page.screenshot({ path: './resultado-consulta.png', fullPage: true });
    console.log('Screenshot salvo como resultado-consulta.png');
    
    console.log('Teste concluído com sucesso!');
  } catch (error) {
    console.error('Erro durante o teste:', error);
  } finally {
    // Aguardar um tempo para visualização manual
    console.log('Aguardando 30 segundos para visualização manual dos resultados...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Garantir que o navegador seja fechado
    if (browser) {
      console.log('Fechando navegador...');
      await browser.close();
      console.log('Navegador fechado com sucesso!');
    }
  }
}

// Executar o teste
testarConsultaProcesso();
