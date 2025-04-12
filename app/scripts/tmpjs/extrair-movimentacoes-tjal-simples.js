/**
 * Script simples para extrair movimentações de um processo no TJAL
 * usando o seletor tr.containerMovimentacao
 */

const { chromium } = require('playwright');
const fs = require('fs');

// Número do processo a ser consultado
const NUMERO_PROCESSO = '0727108-89.2024.8.02.0001';

// URL da página de consulta de processos
const URL_CONSULTA = 'https://www2.tjal.jus.br/cpopg/open.do';

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
    // 1. FAZER LOGIN
    console.log('=== ETAPA 1: FAZENDO LOGIN ===');
    
    // Navegar para a página de login
    console.log('Navegando para a página de login...');
    await page.goto(credenciais.site);
    
    // Preencher credenciais
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', credenciais.usuario);
    await page.fill('#passwordForm', credenciais.senha);
    await page.click('#pbEntrar');
    
    // Aguardar login com timeout maior
    try {
      await page.waitForNavigation({ timeout: 60000 });
      console.log('Login realizado com sucesso!');
    } catch (error) {
      console.log('Timeout ao aguardar navegação após login, tentando continuar...');
      
      // Verificar se estamos na página correta
      const url = page.url();
      console.log(`URL atual após tentativa de login: ${url}`);
      
      // Se ainda estamos na página de login, algo deu errado
      if (url.includes('login')) {
        throw new Error('Falha no login. Verifique as credenciais.');
      }
      
      console.log('Continuando mesmo com timeout, parece que o login foi bem-sucedido.');
    }
    
    // 2. NAVEGAR PARA A PÁGINA DE CONSULTA
    console.log('\n=== ETAPA 2: NAVEGANDO PARA PÁGINA DE CONSULTA ===');
    console.log('Navegando para a página de consulta de processos...');
    await page.goto(URL_CONSULTA);
    
    // 3. PREENCHER DADOS DO PROCESSO
    console.log('\n=== ETAPA 3: PREENCHENDO DADOS DO PROCESSO ===');
    
    // Selecionar o radio button "Unificado"
    console.log('Selecionando opção de número unificado...');
    await page.click('#radioNumeroUnificado');
    
    // Dividir o número do processo
    const partes = NUMERO_PROCESSO.split('.');
    const numeroPrimeiraParte = partes[0]; // 0727108-89.2024
    const numeroTerceiraParte = partes[2]; // 0001
    
    console.log(`Preenchendo número do processo: ${numeroPrimeiraParte} e ${numeroTerceiraParte}...`);
    
    // Preencher os campos do número do processo
    await page.fill('#numeroDigitoAnoUnificado', numeroPrimeiraParte);
    await page.fill('#foroNumeroUnificado', numeroTerceiraParte);
    
    // 4. CONSULTAR
    console.log('\n=== ETAPA 4: CONSULTANDO PROCESSO ===');
    console.log('Clicando no botão de consulta...');
    await page.click('#botaoConsultarProcessos');
    
    // Aguardar carregamento da página de detalhes do processo
    await page.waitForSelector('#containerDadosPrincipaisProcesso');
    console.log('Página de detalhes do processo carregada com sucesso!');
    
    // Aguardar um pouco para garantir que todos os elementos estejam carregados
    console.log('Aguardando 5 segundos para garantir carregamento completo...');
    await page.waitForTimeout(5000);
    
    // 5. EXTRAIR DADOS
    console.log('\n=== ETAPA 5: EXTRAINDO MOVIMENTAÇÕES ===');
    
    // Verificar se há botão para expandir todas as movimentações
    const botaoExpandirTodas = await page.$('#todasMovimentacoes');
    
    if (botaoExpandirTodas) {
      console.log('Encontrado botão para expandir todas as movimentações, clicando...');
      await botaoExpandirTodas.click();
      console.log('Aguardando 3 segundos para carregar todas as movimentações...');
      await page.waitForTimeout(3000);
    }
    
    // Extrair movimentações usando o seletor específico tr.containerMovimentacao
    console.log('Extraindo movimentações usando o seletor tr.containerMovimentacao...');
    
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
        
        // Abordagem alternativa: procurar por todas as linhas que contêm datas
        const todasLinhas = Array.from(document.querySelectorAll('tr'));
        
        // Filtrar linhas que contêm uma data no formato DD/MM/AAAA
        todasLinhas.forEach(linha => {
          const texto = linha.textContent || '';
          const matchData = texto.match(/(\d{2}\/\d{2}\/\d{4})/);
          
          if (matchData) {
            const colunas = linha.querySelectorAll('td');
            
            if (colunas.length >= 2) {
              const data = colunas[0].textContent.trim();
              const descricao = colunas[1] ? colunas[1].textContent.trim() : '';
              
              // Verificar se a primeira coluna parece uma data
              if (data.match(/\d{2}\/\d{2}\/\d{4}/)) {
                resultado.push({
                  data,
                  descricao: limparTexto(descricao)
                });
              }
            }
          }
        });
      }
      
      console.log(`Total de movimentações encontradas: ${resultado.length}`);
      return resultado;
    });
    
    // 6. PROCESSAR E SALVAR DADOS
    console.log('\n=== ETAPA 6: PROCESSANDO E SALVANDO DADOS ===');
    
    // Ordenar movimentações por data (mais recente primeiro)
    const movimentacoesOrdenadas = movimentacoesDOM.sort((a, b) => {
      const dataA = a.data.split('/').reverse().join('-');
      const dataB = b.data.split('/').reverse().join('-');
      return dataB.localeCompare(dataA);
    });
    
    console.log(`\n----- TOTAL DE MOVIMENTAÇÕES: ${movimentacoesOrdenadas.length} -----`);
    movimentacoesOrdenadas.forEach((mov, index) => {
      console.log(`${index + 1}. [${mov.data}] ${mov.descricao || '(sem descrição)'}`);
    });
    
    // Salvar movimentações em arquivo para referência
    fs.writeFileSync('movimentacoes-extraidas.json', JSON.stringify(movimentacoesOrdenadas, null, 2));
    console.log('\nMovimentações salvas em movimentacoes-extraidas.json');
    
    // Aguardar para visualização manual
    console.log('\nAguardando 60 segundos (1 minuto) para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    
    await page.waitForTimeout(60000); // 60 segundos = 1 minuto
    
    return movimentacoesOrdenadas;
  } catch (error) {
    console.error('Erro durante a extração:', error);
    throw error;
  } finally {
    // Fechar o navegador
    await browser.close();
  }
}

// Executar a extração de movimentações
extrairMovimentacoesTJAL()
  .then(movimentacoes => {
    console.log('\nScript finalizado com sucesso.');
  })
  .catch(error => {
    console.error('\nErro na execução do script:', error);
  });
