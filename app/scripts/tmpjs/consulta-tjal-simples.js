/**
 * Script simples para consultar processo no TJAL
 * Faz login, navega para consulta, preenche o processo e extrai movimentações
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
 * Função principal para consultar processo no TJAL
 */
async function consultarProcessoTJAL() {
  console.log(`Iniciando consulta do processo ${NUMERO_PROCESSO} no TJAL...`);
  
  const browser = await chromium.launch({
    headless: false,  // Modo não-headless para visualização
    slowMo: 100  // Adicionar um pequeno atraso para visualização
  });
  
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });
  
  const page = await context.newPage();
  
  try {
    // ETAPA 1: FAZER LOGIN
    console.log('\n=== ETAPA 1: FAZENDO LOGIN ===');
    
    // Navegar para a página de login
    console.log('Navegando para a página de login...');
    await page.goto(credenciais.site);
    
    // Aguardar que a página de login carregue completamente
    await page.waitForSelector('#usernameForm');
    
    // Preencher credenciais
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', credenciais.usuario);
    await page.fill('#passwordForm', credenciais.senha);
    
    // Tirar screenshot antes de clicar no botão de login
    await page.screenshot({ path: 'antes-login.png' });
    
    // Clicar no botão de login
    console.log('Clicando no botão de login...');
    await page.click('#pbEntrar');
    
    // Aguardar redirecionamento após login
    console.log('Aguardando redirecionamento após login...');
    await page.waitForNavigation({ timeout: 30000 }).catch(() => {
      console.log('Timeout ao aguardar navegação após login, mas continuando...');
    });
    
    // Verificar URL após login
    const urlAposLogin = page.url();
    console.log(`URL após login: ${urlAposLogin}`);
    
    // ETAPA 2: NAVEGAR PARA PÁGINA DE CONSULTA
    console.log('\n=== ETAPA 2: NAVEGANDO PARA PÁGINA DE CONSULTA ===');
    
    console.log(`Navegando para a página de consulta: ${URL_CONSULTA}`);
    await page.goto(URL_CONSULTA);
    
    // Aguardar carregamento da página de consulta
    await page.waitForSelector('#radioNumeroUnificado');
    console.log('Página de consulta carregada com sucesso.');
    
    // Tirar screenshot da página de consulta
    await page.screenshot({ path: 'pagina-consulta.png' });
    
    // ETAPA 3: PREENCHER DADOS DO PROCESSO
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
    
    // Tirar screenshot antes de clicar no botão de consulta
    await page.screenshot({ path: 'antes-consulta.png' });
    
    // ETAPA 4: CONSULTAR PROCESSO
    console.log('\n=== ETAPA 4: CONSULTANDO PROCESSO ===');
    
    // Clicar no botão de consulta
    console.log('Clicando no botão de consulta...');
    await page.click('#botaoConsultarProcessos');
    
    // Aguardar carregamento da página de detalhes do processo
    console.log('Aguardando carregamento da página de detalhes...');
    await page.waitForSelector('#containerDadosPrincipaisProcesso', { timeout: 30000 }).catch(() => {
      console.log('Timeout ao aguardar carregamento da página de detalhes, verificando URL...');
    });
    
    // Verificar URL após consulta
    const urlAposConsulta = page.url();
    console.log(`URL após consulta: ${urlAposConsulta}`);
    
    // Tirar screenshot da página de detalhes
    await page.screenshot({ path: 'pagina-detalhes.png', fullPage: true });
    
    // ETAPA 5: EXTRAIR MOVIMENTAÇÕES
    console.log('\n=== ETAPA 5: EXTRAINDO MOVIMENTAÇÕES ===');
    
    // Aguardar um pouco para garantir carregamento completo
    console.log('Aguardando 5 segundos para garantir carregamento completo...');
    await page.waitForTimeout(5000);
    
    // Verificar se há botão para expandir todas as movimentações
    const botaoExpandirTodas = await page.$('#todasMovimentacoes');
    
    if (botaoExpandirTodas) {
      console.log('Encontrado botão para expandir todas as movimentações, clicando...');
      await botaoExpandirTodas.click();
      console.log('Aguardando 3 segundos para carregar todas as movimentações...');
      await page.waitForTimeout(3000);
    }
    
    // Extrair movimentações usando o seletor tr.containerMovimentacao
    console.log('Extraindo movimentações usando o seletor tr.containerMovimentacao...');
    
    const movimentacoes = await page.evaluate(() => {
      // Função para limpar texto
      function limparTexto(texto) {
        if (!texto) return '';
        return texto.replace(/\s+/g, ' ').trim();
      }
      
      // Usar o seletor específico tr.containerMovimentacao
      const movs = Array.from(document.querySelectorAll('tr.containerMovimentacao')).map(row => {
        const colunas = row.querySelectorAll('td');
        const data = colunas[0]?.innerText.trim() || '';
        const descricao = colunas[1]?.innerText.trim() || '';
        
        return {
          data,
          descricao: limparTexto(descricao)
        };
      });
      
      console.log(`Encontradas ${movs.length} movimentações com o seletor específico.`);
      
      // Se não encontramos nada com o seletor específico, tentar abordagem alternativa
      if (movs.length === 0) {
        console.log('Tentando abordagem alternativa para extrair movimentações...');
        
        // Buscar todas as tabelas que podem conter movimentações
        const tabelas = document.querySelectorAll('table');
        
        tabelas.forEach(tabela => {
          const linhas = tabela.querySelectorAll('tr');
          
          linhas.forEach(linha => {
            const colunas = linha.querySelectorAll('td');
            
            if (colunas.length >= 2) {
              const data = colunas[0].textContent.trim();
              const descricao = colunas[1].textContent.trim();
              
              // Verificar se a primeira coluna parece uma data
              if (data.match(/\d{2}\/\d{2}\/\d{4}/)) {
                movs.push({
                  data,
                  descricao: limparTexto(descricao)
                });
              }
            }
          });
        });
      }
      
      return movs;
    });
    
    // Exibir movimentações encontradas
    console.log(`\n----- TOTAL DE MOVIMENTAÇÕES: ${movimentacoes.length} -----`);
    
    if (movimentacoes.length > 0) {
      movimentacoes.forEach((mov, index) => {
        console.log(`${index + 1}. [${mov.data}] ${mov.descricao || '(sem descrição)'}`);
      });
      
      // Salvar movimentações em arquivo para referência
      fs.writeFileSync('movimentacoes-extraidas.json', JSON.stringify(movimentacoes, null, 2));
      console.log('\nMovimentações salvas em movimentacoes-extraidas.json');
    } else {
      console.log('Nenhuma movimentação encontrada.');
    }
    
    // Aguardar para visualização manual
    console.log('\nAguardando 180 segundos (3 minutos) para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    
    await page.waitForTimeout(180000); // 3 minutos
    
  } catch (error) {
    console.error('Erro durante a consulta:', error);
    
    // Tirar screenshot em caso de erro
    try {
      await page.screenshot({ path: 'erro.png', fullPage: true });
      console.log('Screenshot do erro salvo como erro.png');
    } catch (screenshotError) {
      console.error('Erro ao tirar screenshot:', screenshotError);
    }
  } finally {
    // Fechar o navegador
    await browser.close();
    console.log('Navegador fechado.');
  }
}

// Executar a consulta
consultarProcessoTJAL()
  .then(() => console.log('Script concluído com sucesso!'))
  .catch(error => console.error('Erro na execução do script:', error));
